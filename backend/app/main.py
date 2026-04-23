from fastapi import FastAPI
from pydantic import BaseModel
from app.services import process_query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
)

class QueryRequest(BaseModel):
      query:str

@app.get("/")
def root():
      return {"message": "AI Data Copilot Running"}

@app.post("/query")
def query_db(request: QueryRequest):
      try:
            response = process_query(request.query)
            return response
      except Exception as exc:
            return {"error": "Server error", "details": str(exc)}
