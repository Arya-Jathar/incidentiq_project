"""
detect_realtime.py — Real-time Juice Shop log monitor for IncidentIQ

Usage:
    python detect_realtime.py <docker-container-name>

Example:
    python detect_realtime.py juice-shop

Watches Docker logs live. When errors are detected, automatically
triggers the IncidentIQ AI pipeline and shows results in real-time.
"""

import os
import sys
import time
import subprocess
import threading
import socketio
from google import genai
from dotenv import load_dotenv

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
SERVER_URL = os.environ.get("SERVER_URL", "http://localhost:3000")
COOLDOWN_SECONDS = 60      # min seconds between pipeline triggers
ERROR_BUFFER_WINDOW = 10   # seconds to collect errors before triggering
MIN_ERROR_LINES = 1        # trigger on any single error

client = genai.Client(api_key=GEMINI_API_KEY)

# ── State ────────────────────────────────────────────────────────────────────
error_buffer = []
buffer_lock = threading.Lock()
last_triggered = 0
pipeline_running = False


# ── Socket.IO ────────────────────────────────────────────────────────────────
sio = socketio.Client(
    reconnection=True,
    reconnection_attempts=5,
    logger=False,
    engineio_logger=False
)

@sio.event
def connect():
    print("✅ Connected to IncidentIQ server\n")

@sio.event
def disconnect():
    print("⚠️  Disconnected from server")

@sio.on("agent-update")
def on_agent_update(data):
    name = data.get("name", "Agent")
    result = data.get("result", "")
    print(f"  🤖 [{name}] {result[:120]}...")

@sio.on("pipeline-complete")
def on_pipeline_complete(data):
    global pipeline_running
    incident_id = data.get("incidentId", "unknown")
    print(f"\n✅ Pipeline complete! Incident saved → ID: {incident_id}")
    print(f"   View it at: {SERVER_URL.replace('http', 'https')}/dashboard\n")
    print("─" * 60)
    print("👀 Watching for new errors...\n")
    pipeline_running = False

@sio.on("pipeline-error")
def on_pipeline_error(data):
    global pipeline_running
    print(f"\n❌ Pipeline error: {data.get('message', 'Unknown error')}\n")
    pipeline_running = False


# ── Core functions ────────────────────────────────────────────────────────────
def is_error_line(line: str) -> bool:
    """Return True if the log line looks like an error."""
    error_keywords = [
        "error", "Error", "ERROR",
        "exception", "Exception",
        "TypeError", "ReferenceError", "SyntaxError",
        "UnhandledPromiseRejection",
        "WARN", "warn",
        "failed", "Failed",
        "crash", "Crash",
        "500", "502", "503",
    ]
    return any(kw in line for kw in error_keywords)


def generate_description(error_lines: list[str]) -> str:
    """Use Gemini to produce a short incident title + raw log context for the pipeline."""
    error_block = "\n".join(error_lines[-30:])
    prompt = f"""You are an on-call engineer triaging a server error.
Write a SHORT incident title in 4-6 words maximum. Be specific about the error type.
Examples: "SQL injection on login endpoint", "Auth service 500 error", "Unhandled promise rejection in API"

Log excerpt:
{error_block}

Short incident title (4-6 words only):"""

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt
        )
        short_title = response.text.strip().strip('"').strip("'")
    except Exception as e:
        print(f"  ⚠️ Gemini generation error ({e}). Using fallback title.")
        short_title = "Automated log error detection"

    # Return short title + raw logs so the pipeline has full context
    return f"{short_title}\n\nRaw log context:\n{error_block}"



def trigger_pipeline(errors: list[str]):
    """Generate description and fire the IncidentIQ pipeline."""
    global last_triggered, pipeline_running

    if pipeline_running:
        print("⏳ Pipeline already running, skipping...\n")
        return

    now = time.time()
    if now - last_triggered < COOLDOWN_SECONDS:
        remaining = int(COOLDOWN_SECONDS - (now - last_triggered))
        print(f"⏱️  Cooldown active — {remaining}s remaining before next trigger\n")
        return

    pipeline_running = True
    last_triggered = now

    print("\n" + "═" * 60)
    print(f"🚨 INCIDENT DETECTED — {len(errors)} error lines captured")
    print("═" * 60)
    print("📝 Generating incident description via Gemini...")

    try:
        description = generate_description(errors)
        print(f"\nDescription: {description[:200]}...\n")
        print("🚀 Triggering AI pipeline on IncidentIQ...\n")
        sio.emit("run-pipeline", {"incident_description": description})
    except Exception as e:
        print(f"❌ Failed to trigger pipeline: {e}\n")
        pipeline_running = False


def flush_buffer():
    """Periodically flush the error buffer and trigger pipeline if needed."""
    global error_buffer

    while True:
        time.sleep(ERROR_BUFFER_WINDOW)
        errors_to_process = []
        with buffer_lock:
            if len(error_buffer) >= MIN_ERROR_LINES:
                errors_to_process = error_buffer.copy()
                error_buffer = []

        if len(errors_to_process) >= MIN_ERROR_LINES:
            trigger_pipeline(errors_to_process)
            errors_to_process = []


def tail_docker_logs(container_name: str):
    """Tail Docker container logs in real-time and buffer error lines."""
    global error_buffer

    print(f"🔍 Tailing logs from container: {container_name}")
    print(f"⚡ Pipeline will trigger after {MIN_ERROR_LINES}+ errors in {ERROR_BUFFER_WINDOW}s window")
    print(f"⏱️  Cooldown between triggers: {COOLDOWN_SECONDS}s")
    print("─" * 60)
    print("👀 Watching for errors...\n")

    try:
        process = subprocess.Popen(
            ["docker", "logs", "--follow", "--tail", "0", container_name],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        for line in process.stdout:
            line = line.strip()
            if not line:
                continue

            if is_error_line(line):
                print(f"  ⚠️  {line[:100]}")
                with buffer_lock:
                    error_buffer.append(line)

    except FileNotFoundError:
        print("❌ Docker not found. Make sure Docker is running and 'docker' is in your PATH.")
        sys.exit(1)
    except KeyboardInterrupt:
        process.terminate()


# ── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python detect_realtime.py <docker-container-name>")
        print("Example: python detect_realtime.py juice-shop")
        sys.exit(1)

    container_name = sys.argv[1]

    print("\n⚡ IncidentIQ — Real-time Log Monitor")
    print(f"   Server: {SERVER_URL}")
    print(f"   Container: {container_name}\n")

    # Connect to IncidentIQ server
    try:
        sio.connect(
            SERVER_URL,
            transports=["polling", "websocket"],
            wait_timeout=15
        )
    except Exception as e:
        print(f"❌ Could not connect to IncidentIQ server at {SERVER_URL}")
        print(f"   Error: {e}")
        sys.exit(1)

    # Start background buffer flusher
    flush_thread = threading.Thread(target=flush_buffer, daemon=True)
    flush_thread.start()

    # Start tailing logs (blocks until Ctrl+C)
    try:
        tail_docker_logs(container_name)
    except KeyboardInterrupt:
        print("\n\n👋 Stopped monitoring.")
        sio.disconnect()
