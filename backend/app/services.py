import json
from app.formatter import format_response
from app.llm import decide_and_generate
from app.tools import explain_tool, sql_tool



def process_query(user_input: str):
      dangerous_keywords = ["delete", "drop", "update", "truncate"]

      if any(word in user_input.lower() for word in dangerous_keywords):
            return {
                  "type": "text",
                  "message": "⚠️ This action is restricted for safety. Data modification queries are not allowed."
            }
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
                  formatted = format_response(user_input, result)
            except Exception as exc:
                  return {"error": "Failed to execute SQL", "details": str(exc)}
            return {
                  "action":action,
                  "sql":sql,
                  "result":result,
                  "type": formatted.get("type", "text"),
                  "message": formatted.get("message", "Unable to format response"),
                  "data": formatted.get("data", [])
            }
      elif action == "explain":
            try:
                  sample_data = sql_tool("select * from orders limit 5")
                  explanation = explain_tool(sample_data)
                  formatted = {
                        "type": "text",
                        "message": explanation or "Unable to format response",
                        "data": []
                  }
            except Exception as exc:
                  return {"error": "Failed to generate explanation", "details": str(exc)}
            return {
                  "action":"explain",
                  "result":explanation,
                  "type": formatted["type"],
                  "message": formatted["message"],
                  "data": formatted["data"]
            }
      elif action == "reject":
            return {
                  "type": "text",
                  "message": "⚠️ This request is not allowed for safety reasons."
            }
      else:
            return {"error": "Unknown action"}
