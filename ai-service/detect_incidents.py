import os
import sys
import time
import socketio
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

SERVER_URL = os.environ.get("SERVER_URL", "http://localhost:3000")  # your Express server (adjust if different)

sio = socketio.Client()
pipeline_done = False

@sio.event
def connect():
    print("Connected to server socket")

@sio.on("agent-update")
def on_agent_update(data):
    print(f"  [{data['name']}] {data['result']}")

@sio.on("pipeline-complete")
def on_pipeline_complete(data):
    global pipeline_done
    print("\n--- Pipeline complete, saved as incident:", data.get("incidentId"), "---")
    pipeline_done = True

@sio.on("pipeline-error")
def on_pipeline_error(data):
    global pipeline_done
    print("Pipeline error:", data.get("message"))
    pipeline_done = True

def extract_error_block(log_text):
    """Pull out the most recent error/stack trace from raw logs."""
    lines = log_text.strip().split("\n")
    error_lines = []
    capturing = False
    for line in lines:
        if "Error" in line or "error" in line.lower():
            capturing = True
        if capturing:
            error_lines.append(line)
    return "\n".join(error_lines[-25:])

def generate_description(error_block):
    prompt = f"""You are on-call and just saw this error in your server logs.
Write a one-paragraph incident description a human engineer would write when opening a ticket.
Be factual, based only on what's in the log. Mention the error type and where it occurred.

Log excerpt:
{error_block}

Incident description:"""

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )
    return response.text.strip()

if __name__ == "__main__":
    log_file = sys.argv[1] if len(sys.argv) > 1 else "juiceshop_logs.txt"

    with open(log_file, "r") as f:
        raw_logs = f.read()

    error_block = extract_error_block(raw_logs)
    if not error_block:
        print("No error found in logs.")
        sys.exit(0)

    print("--- Extracted error ---")
    print(error_block)

    description = generate_description(error_block)
    print("\n--- Generated incident description ---")
    print(description)

    print("\n--- Triggering pipeline via server socket ---")
    sio.connect(SERVER_URL)
    sio.emit("run-pipeline", {"incident_description": description})

    # Wait for pipeline-complete or pipeline-error, with a timeout
    timeout = 60
    waited = 0
    while not pipeline_done and waited < timeout:
        time.sleep(1)
        waited += 1

    if not pipeline_done:
        print("Timed out waiting for pipeline to complete.")

    sio.disconnect()