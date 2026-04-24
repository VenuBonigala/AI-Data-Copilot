import time

from app.llm import client


MODELS = ["google/gemma-4-31b-it:free"]
NUMERIC_TYPES = (int, float)


def _is_numeric(value):
    return isinstance(value, NUMERIC_TYPES) and not isinstance(value, bool)


def _fallback_message(data):
    if not data:
        return "No data found"

    if isinstance(data, dict):
        return data.get("message") or data.get("error") or "Unable to format response"

    if not isinstance(data, list):
        return "Unable to format response"

    row_count = len(data)
    numeric_total = 0
    numeric_fields = 0

    for row in data:
        if not isinstance(row, dict):
            continue

        for value in row.values():
            if _is_numeric(value):
                numeric_fields += 1

    if numeric_fields:
        return (
            f"I found {row_count} rows. "
        )

    return f"I found {row_count} rows matching your request."


def _generate_message(user_query, data):
    prompt = f"""
You are a concise analytics assistant.

Write a short, human-friendly explanation of the query result.
Keep it to 1-2 sentences, avoid markdown, and mention the most useful takeaway.

User query:
{user_query}

Data:
{data}
"""

    for model in MODELS:
        for attempt in range(2):
            try:
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                )
                content = response.choices[0].message.content
                if content:
                    return content.strip()
            except Exception as exc:
                print(f"{model} formatter attempt {attempt + 1} failed:", exc)
                time.sleep(2)

    return _fallback_message(data)


def _pick_chart_field(rows):
    if not rows or not isinstance(rows[0], dict):
        return None

    lowered_keys = {key.lower(): key for key in rows[0].keys()}
    for preferred_key in ("amount", "total", "price", "value", "count"):
        if preferred_key in lowered_keys:
            return lowered_keys[preferred_key]

    for key in rows[0].keys():
        if any(_is_numeric(row.get(key)) for row in rows if isinstance(row, dict)):
            return key

    return None


def format_response(user_query: str, data) -> dict:
    try:
        if isinstance(data, dict):
            if data.get("error"):
                return {"type": "text", "message": data["error"]}
            if data.get("message"):
                return {"type": "text", "message": data["message"]}

        if not data:
            return {"type": "text", "message": "No data found"}

        if not isinstance(data, list):
            return {"type": "text", "message": _generate_message(user_query, data)}

        if "user" in user_query.lower():
            return {
                "type": "table",
                "message": _generate_message(user_query, data),
                "data": data,
            }
        if len(data) <= 8:
            return {
                "type": "table",
                "message": _generate_message(user_query, data),
                "data": data,
            }

        chart_field = _pick_chart_field(data)
        if chart_field and any(word in user_query.lower() for word in ["total", "sum", "revenue", "sales", "trend"]):
            return {
                "type": "chart",
                "message": _generate_message(user_query, data),
                "data": data,
            }
        return {
            "type": "table",
            "message": _generate_message(user_query, data),
            "data": data,
        }
    except Exception:
        return {"type": "text", "message": "Unable to format response"}
