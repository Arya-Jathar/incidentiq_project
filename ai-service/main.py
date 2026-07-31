from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pipeline import app as pipeline_graph, get_embedding

api = FastAPI()

class IncidentRequest(BaseModel):
    incident_description: str

class EmbedRequest(BaseModel):
    text: str

@api.get("/")
def health():
    return {"status": "ok", "service": "IncidentIQ AI Service"}

@api.post("/run-pipeline")
def run_pipeline(request: IncidentRequest):
    try:
        result = pipeline_graph.invoke({
            "incident_description": request.incident_description,
            "severity": "",
            "affected_service": "",
            "root_cause": "",
            "runbook_title": "",
            "runbook_steps": [],
            "comms_update": "",
            "fix_applied": "",
            "prevention_steps": []
        })
        return result
    except Exception as e:
        print(f"Pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api.post("/embed")
def embed_text(request: EmbedRequest):
    try:
        embedding = get_embedding(request.text)
        return {"embedding": embedding}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))