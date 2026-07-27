from dotenv import load_dotenv
load_dotenv()
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime

from typing import Optional

class ModelName(str, Enum):
    LLAMA_70B = "llama-3.3-70b-versatile"
    LLAMA_8B = "llama-3.1-8b-instant"
    MIXTRAL = "mixtral-8x7b-32768"

class QueryInput(BaseModel):
    question: str
    session_id: Optional[str] = Field(default=None)
    model: ModelName = Field(default=ModelName.LLAMA_70B)

class QueryResponse(BaseModel):
    answer: str
    session_id: str
    model: ModelName

class DocumentInfo(BaseModel):
    id: int
    filename: str
    upload_timestamp: datetime

class DeleteFileRequest(BaseModel):
    file_id: int