from typing import TypedDict
from langgraph.graph import StateGraph, END
from google import genai
from google.genai import errors as genai_errors
import os
import json
import time
from dotenv import load_dotenv
from pymongo import MongoClient
load_dotenv()

mongo_client = MongoClient(os.environ["MONGODB_URI"])
db = mongo_client["incidentiq"]
runbooks_collection = db["runbooks"]

client = genai.Client(api_key = os.environ["GEMINI_API_KEY"])

def generate_with_retry(model, contents, max_retries=4):
    """Wraps client.models.generate_content with retry+backoff for
    transient 503 UNAVAILABLE and 429 RESOURCE_EXHAUSTED errors."""
    delay = 5
    for attempt in range(max_retries):
        try:
            return client.models.generate_content(model=model, contents=contents)
        except (genai_errors.ServerError, genai_errors.ClientError) as e:
            if attempt == max_retries - 1:
                raise
            print(f"  Gemini error (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {delay}s...")
            time.sleep(delay)
            delay *= 2

class IncidentState(TypedDict):
    incident_description: str
    severity: str
    affected_service: str
    root_cause: str
    runbook_title: str
    runbook_steps: list
    comms_update: str
    fix_applied: str
    prevention_steps: str

def triage_node(state: IncidentState) -> IncidentState:
    print("Running Triage Agent...")

    prompt = f"""You are an incident triage classifier.

    Analyze the incident description and respond with ONLY a valid JSON object 
    in this exact format, with no other text before or after it:

    {{
        "severity": "P0 or P1 or P2 or P3",
        "affected_service": "the name of the service affected, in a few words"
    }}

    Incident description: {state['incident_description']}"""
    response = generate_with_retry(
            model="gemini-3.5-flash-lite",
            contents=prompt
        )

    result_text = response.text.strip()
    parsed = safe_json_parse(result_text, {"severity": "P2", "affected_service": "Unknown"})

    state["severity"] = parsed.get("severity", "P2")
    state["affected_service"] = parsed.get("affected_service", "Unknown")

    return state

def root_cause_node(state: IncidentState) -> IncidentState:
    print("Running Root Cause Agent...")

    prompt = f"""You are a root cause analysis assistant for incident response.

    Given the following incident details, provide a brief, plausible root cause 
    hypothesis in ONE sentence. Be specific and technical where possible.

    Incident description: {state['incident_description']}
    Affected service: {state['affected_service']}
    Severity: {state['severity']}

    Root cause hypothesis:"""

    response = generate_with_retry(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )

    state["root_cause"] = response.text.strip()
    return state

def get_embedding(text):
    delay = 5
    for attempt in range(4):
        try:
            result = client.models.embed_content(
                model="gemini-embedding-001",
                contents=text
            )
            return result.embeddings[0].values
        except (genai_errors.ServerError, genai_errors.ClientError) as e:
            if attempt == 3:
                raise
            print(f"  Embedding error (attempt {attempt + 1}/4): {e}. Retrying in {delay}s...")
            time.sleep(delay)
            delay *= 2

def safe_json_parse(text, default_val):
    try:
        clean_text = text.replace("```json", "").replace("```", "").strip()
        import re
        match = re.search(r'\{.*\}', clean_text, re.DOTALL)
        if match:
            clean_text = match.group(0)
        return json.loads(clean_text)
    except Exception as e:
        print(f"JSON parsing failed: {e}. Raw text: {text}")
        return default_val

def runbook_node(state: IncidentState) -> IncidentState:
    print("Running Runbook Agent...")

    search_text = f"{state['affected_service']} - {state['root_cause']}"
    incident_embedding = get_embedding(search_text)

    pipeline = [
        {
            "$vectorSearch" : {
                "index" : "runbook_vector_index",
                "path" : "embedding" ,
                "queryVector" : incident_embedding,
                "numCandidates" : 10,
                "limit" : 1
            }
        },
        {
            "$project": {
                "title": 1,
                "service": 1,
                "steps": 1,
                "score": { "$meta": "vectorSearchScore" }
            }
        }
    ]

    results = list(runbooks_collection.aggregate(pipeline))

    # If the database isn't empty, check the similarity score of the best match
    if len(results) > 0:
        best_score = results[0].get("score", 0)
        print(f"Best runbook match score: {best_score}")
        # Threshold: 0.8 is a good baseline for strong cosine similarity with Gemini embeddings
        if best_score < 0.80:
            print("Match score too low, discarding result.")
            results = []

    if len(results) == 0:
        print("No runbook found. Generating a new one autonomously...")
        prompt = f"""You are a DevOps expert. An incident has occurred, and there is no existing runbook.
        
        Incident: {state['incident_description']}
        Affected service: {state['affected_service']}
        Root cause hypothesis: {state['root_cause']}
        
        Create a new runbook for this specific issue. Provide a clear title, and a list of 3-5 specific steps to resolve it.
        
        Respond ONLY with a valid JSON object in this format:
        {{
            "title": "Clear, concise runbook title",
            "steps": ["Step 1", "Step 2", "Step 3"]
        }}"""
        
        response = generate_with_retry(
            model="gemini-3.5-flash-lite",
            contents=prompt
        )
        
        parsed = safe_json_parse(response.text, {"title": f"Fix: {state['root_cause']}", "steps": ["Investigate manually"]})
        new_title = parsed.get("title", f"Fix: {state['root_cause']}") + " (AI Generated)"
        new_steps = parsed.get("steps", ["Investigate manually"])
        
        state["runbook_title"] = new_title
        state["runbook_steps"] = new_steps
        
        return state
    
    best_match = results[0]
    state["runbook_title"] = best_match["title"]
    state["runbook_steps"] = best_match["steps"]
    return state

def comms_node(state: IncidentState) -> IncidentState:
    print("Running Comms Agent...")

    prompt = f"""You are drafting an internal team communication update about an ongoing incident.

    Be concise, professional, and clear. Include: what's affected, the current 
    understanding of the cause, and that the team is actively working on it. 
    Keep it to 2-3 sentences, suitable for posting in a Slack channel.

    Severity: {state['severity']}
    Affected service: {state['affected_service']}
    Root cause hypothesis: {state['root_cause']}
    Runbook being followed: {state['runbook_title']}

    Team update:"""

    response = generate_with_retry(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )

    state["comms_update"] = response.text.strip()
    return state

def postmortem_node(state: IncidentState) -> IncidentState:
    print("Running Postmortem Agent...")

    prompt = f"""You are writing a postmortem report for a resolved incident.

    Based on the information below, write:
    1. A one-sentence summary of the fix applied (assume the runbook steps were followed successfully)
    2. Two brief prevention recommendations for the future

    Respond with ONLY a valid JSON object in this exact format:

    {{
        "fix_applied": "one sentence describing the fix",
        "prevention_steps": ["first recommendation", "second recommendation"]
    }}

    Severity: {state['severity']}
    Affected service: {state['affected_service']}
    Root cause: {state['root_cause']}
    Runbook followed: {state['runbook_title']}
    Runbook steps: {state['runbook_steps']}"""

    response = generate_with_retry(
        model="gemini-3.5-flash-lite",
        contents=prompt
    )

    result_text = response.text.strip()
    parsed = safe_json_parse(result_text, {"fix_applied": "Manual resolution needed", "prevention_steps": []})

    state["fix_applied"] = parsed.get("fix_applied", "Manual resolution needed")
    state["prevention_steps"] = parsed.get("prevention_steps", [])

    return state

def summary_node(state: IncidentState) -> IncidentState:
    print(f"Incident classified as {state['severity']} : {state['incident_description']}")
    return state

graph = StateGraph(IncidentState)

graph.add_node("triage", triage_node)
graph.add_node("root_cause", root_cause_node)
graph.add_node("runbook", runbook_node)
graph.add_node("comms", comms_node)
graph.add_node("postmortem", postmortem_node)

graph.set_entry_point("triage")
graph.add_edge("triage", "root_cause")
graph.add_edge("root_cause", "runbook")
graph.add_edge("runbook", "comms")
graph.add_edge("comms", "postmortem")
graph.add_edge("postmortem", END)

app = graph.compile()
if __name__ == "__main__":
    result = app.invoke({
        "incident_description" : "Users are unable to log in. Authentication requests are timing out after 30 seconds. This started after this morning's deployment.",
        "severity" : "",
        "affected_service" : "",
        "root_cause" : "",
        "runbook_title" : "",
        "runbook_steps" : [],
        "comms_update" : "",
        "fix_applied" : "",
        "prevention_steps" : []
    })

    print(json.dumps(result, indent = 2))