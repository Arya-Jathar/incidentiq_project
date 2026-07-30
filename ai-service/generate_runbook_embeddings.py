from dotenv import load_dotenv
load_dotenv()

import os
from google import genai
from pymongo import MongoClient

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
mongo_client = MongoClient(os.environ["MONGODB_URI"])
db = mongo_client["incidentiq"]
runbooks_collection = db["runbooks"]

def get_embedding(text):
    result = client.models.embed_content(
        model="gemini-embedding-001",
        contents=text
    )
    return result.embeddings[0].values

runbooks_without_embeddings = runbooks_collection.find({"embedding": {"$size": 0}})

for runbook in runbooks_without_embeddings:
    text_to_embed = f"{runbook['title']} - {runbook['service']} - {' '.join(runbook['tags'])}"

    print(f"Generating embedding for: {runbook['title']}")

    embedding = get_embedding(text_to_embed)

    runbooks_collection.update_one(
        {"_id": runbook["_id"]},
        {"$set": {"embedding": embedding}}
    )

    print(f"Saved embedding for: {runbook['title']}")

print("Done!")