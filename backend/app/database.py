from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import datetime
from decimal import Decimal

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

forbidden_keywords = ["DROP", "DELETE", "TRUNCATE", "ALTER"]

def is_safe_query(query: str):
      return not any(keyword in query.upper() for keyword in forbidden_keywords)

def clean_data(rows):
    cleaned = []
    for row in rows:
        new_row = {}
        for key, value in row.items():
            if isinstance(value, Decimal):
                new_row[key] = float(value)
            elif isinstance(value, datetime.date):
                new_row[key] = value.isoformat()
            else:
                new_row[key] = value
        cleaned.append(new_row)
    return cleaned

def execute_query(query: str):
      if not is_safe_query(query) :
            return {"error" : "Unsafe query blocked"}
      
      with engine.connect() as connection:
            result = connection.execute(text(query))
            connection.commit()
            try:
                  data = [dict(row._mapping) for row in result]
                  return clean_data(data)
            except:
                  return {"message":"Query executed successfully"}
