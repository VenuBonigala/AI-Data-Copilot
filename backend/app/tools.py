from app.database import execute_query
from app.llm import client
import time

def sql_tool(query: str) :
      return execute_query(query)

from app.llm import client
import time

MODELS = [
    "google/gemma-4-31b-it:free"
]

def basic_explain(data):
    if not data or isinstance(data, dict):
        return "No meaningful data available to analyze."

    total = sum(item.get("amount", 0) for item in data if "amount" in item)
    count = len(data)

    return f"""
The dataset contains {count} records.

Total transaction amount: {total}

This indicates overall activity in the system. More records suggest higher usage.
"""

def explain_tool(data):
    prompt = f"""
You are a data analyst.

Explain the following data in simple terms.
Highlight trends, patterns, and insights.

Data:
{data}
"""

    for model in MODELS:
        for attempt in range(2):
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}]
                )

                content = response.choices[0].message.content

                if content:
                    return content.strip()

            except Exception as e:
                print(f"{model} attempt {attempt+1} failed:", e)
                time.sleep(2)

    return basic_explain(data)