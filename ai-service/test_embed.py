from google import genai
import os
from dotenv import load_dotenv
load_dotenv()
client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
try:
    res = client.models.embed_content(model="text-embedding-004", contents="test")
    print("004 Success")
except Exception as e:
    print(f"004 Error: {type(e)} {e}")

try:
    res = client.models.embed_content(model="gemini-embedding-001", contents="test")
    print("001 Success")
except Exception as e:
    print(f"001 Error: {type(e)} {e}")
