from dotenv import load_dotenv
load_dotenv()

import os
from google import genai
import numpy as np

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

def get_embedding(text):
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text
    )
    return result.embeddings[0].values

def cosine_similarity(vec1, vec2):
    vec1 = np.array(vec1)
    vec2 = np.array(vec2)
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

incident = "Payments service is completely down, database connection timeouts detected"

runbooks = [
    "Rollback procedure for payment service deployment failures and database issues",
    "Steps for resetting user passwords when accounts get locked",
    "Guide for clearing browser cache when the frontend fails to load styles"
]

incident_embedding = get_embedding(incident)

print(f"Incident: {incident}\n")

for runbook in runbooks:
    runbook_embedding = get_embedding(runbook)
    similarity = cosine_similarity(incident_embedding, runbook_embedding)
    print(f"Similarity {similarity:.4f} — {runbook}")