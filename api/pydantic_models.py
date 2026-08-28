from dotenv import load_dotenv
load_dotenv()
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime

from typing import Optional

class ModelName(str, Enum):
    GPT_OSS_120B = "openai/gpt-oss-120b"
    GPT_OSS_20B = "openai/gpt-oss-20b"
    QWEN_27B = "qwen/qwen3.8-27b"
    GROQ_COMPOUND = "groq/compound"

class QueryInput(BaseModel):
    question: str
    session_id: Optional[str] = Field(default=None)
    model: ModelName = Field(default=ModelName.GPT_OSS_120B)

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