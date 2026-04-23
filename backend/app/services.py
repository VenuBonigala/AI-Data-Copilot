import json
from app.llm import decide_and_generate
from app.tools import explain_tool, sql_tool

def process_query(user_input: str):
      try:
            decision = decide_and_generate(user_input)
      except Exception as exc:
            return {"error": "Failed to generate response", "details": str(exc)}

      try:
            decision_json = json.loads(decision)
      except:
            return {"error":"Invalid AI response", "raw": decision}
      
      action = decision_json.get("action")
      sql = decision_json.get("sql")

      if action == "query" or action == "insert":
            if not sql:
                  return {"error": "No SQL generated for requested action", "action": action}
            try:
                  result = sql_tool(sql)
            except Exception as exc:
                  return {"error": "Failed to execute SQL", "details": str(exc)}
            return {
                  "action":action,
                  "sql":sql,
                  "result":result
            }
      elif action == "explain":
            try:
                  sample_data = sql_tool("select * from orders limit 5")
                  explanation = explain_tool(sample_data)
            except Exception as exc:
                  return {"error": "Failed to generate explanation", "details": str(exc)}
            return {
                  "action":"explain",
                  "result":explanation
            }
      else:
            return {"error": "Unknown action"}
