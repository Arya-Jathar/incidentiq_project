from fastapi import FastAPI
from pydantic import BaseModel
from pipeline import app as pipeline_graph, get_embedding

api = FastAPI()

class IncidentRequest(BaseModel):
    incident_description: str

class EmbedRequest(BaseModel):
    text: str

@api.post("/run-pipeline")
def run_pipeline(request: IncidentRequest):
    result = pipeline_graph.invoke({
        "incident_description" : request.incident_description,
        "severity" : "",
        "affected_service" : "",
        "root_cause" : "",
        "runbook_title" : "",
        "runbook_steps" : [],
        "comms_update" : "",
        "fix_applied" : "",
        "prevention_steps" : []
    })
    return result

@api.post("/embed")
def embed_text(request: EmbedRequest):
    embedding = get_embedding(request.text)
    return {"embedding": embedding}