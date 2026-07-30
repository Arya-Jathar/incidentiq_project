from dotenv import load_dotenv
load_dotenv()

import os
from google import genai

client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])

incident_description = "Multiple customers report failed checkout transactions. Approximately 15% of payment attempts are failing."

prompt = f"""You are an incident severity classifier.

Here are examples of correctly classified incidents:

Incident: "Login page returns a 404 error for approximately 2% of users in one region."
Severity: P2

Incident: "Entire platform is down for all users, no requests are succeeding."
Severity: P0

Incident: "A minor visual bug in the settings page — a button is misaligned."
Severity: P3

Now classify this incident. Respond with EXACTLY ONE WORD: P0, P1, P2, or P3.

Incident: "{incident_description}"
Severity:"""

response = client.models.generate_content(
    model="gemini-3.5-flash",
    contents=prompt
)

print(response.text)