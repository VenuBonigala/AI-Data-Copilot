import json
import os
from openai import OpenAI
from dotenv import load_dotenv
from app.schema import SCHEMA

load_dotenv()

client = OpenAI(
      base_url="https://openrouter.ai/api/v1",
      api_key = os.getenv("OPENAI_API_KEY")
)

def _fallback_decision(user_query: str):
      lowered = user_query.lower()

      if any(word in lowered for word in ["explain", "insight", "summary", "analyze"]):
            return {"action": "explain", "sql": None}

      if any(word in lowered for word in ["add ", "insert ", "create ", "new "]):
            return {"action": "insert", "sql": None}

      return {"action": "query", "sql": "select * from orders limit 5"}

def decide_and_generate(user_query: str):
      prompt = f"""
      You are an AI Data Assistant.

      Here is the database schema:
      {SCHEMA}

      Assistant Job:
      - Decide what the user wants
      - If its a database query, then generate sql
      - if its explanation, then say Explain
      - if its insertion, generate insert sql

      Rules:
      - Only generate SELECT queries
      - DO NOT generate DELETE, DROP, ALTER, TRUNCATE
      - Use proper JOINs when needed
      - Only return SQL query (no explanation)
      - Respond only in this JSON format:
      {{
            "action":"query | explain | insert",
            "sql": "sql query or null" 
      }}

      User Query: {user_query}
      """

      try:
            response = client.chat.completions.create(
                  model = "openai/gpt-oss-120b:free",
                  messages=[{"role":"user", "content":prompt}]
            )
            return response.choices[0].message.content.strip()
      except Exception:
            return json.dumps(_fallback_decision(user_query))



