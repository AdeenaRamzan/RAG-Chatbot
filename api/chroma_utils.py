import os
from dotenv import load_dotenv
load_dotenv()
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, UnstructuredHTMLLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_chroma import Chroma
from typing import List
from langchain_core.documents import Document

is_vercel = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
if is_vercel:
    os.environ["HF_HOME"] = "/tmp/hf_home"
    os.environ["FASTEMBED_CACHE_PATH"] = "/tmp/fastembed_cache"

# Initialize text splitter and embedding function
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200, length_function=len)
cache_dir = "/tmp/fastembed_cache" if is_vercel else None
embedding_function = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5", cache_dir=cache_dir)

# Initialize Chroma vector store
chroma_dir = "/tmp/chroma_db" if is_vercel else "./chroma_db"
if is_vercel and not os.path.exists(chroma_dir):
    os.makedirs(chroma_dir, exist_ok=True)

vectorstore = Chroma(persist_directory=chroma_dir, embedding_function=embedding_function)

from db_utils import insert_document_chunks, get_all_document_chunks, delete_document_chunks_by_file_id

def ensure_vectorstore_populated():
    try:
        count = vectorstore._collection.count()
        if count == 0:
            saved_chunks = get_all_document_chunks()
            if saved_chunks:
                docs = [
                    Document(page_content=item["chunk_text"], metadata={"file_id": item["file_id"]})
                    for item in saved_chunks
                ]
                vectorstore.add_documents(docs)
                print(f"Auto-restored {len(docs)} document chunks into vectorstore")
    except Exception as e:
        print(f"Error ensuring vectorstore populated: {e}")

def load_and_split_document(file_path: str) -> List[Document]:
    if file_path.endswith('.pdf'):
        loader = PyPDFLoader(file_path)
    elif file_path.endswith('.docx'):
        loader = Docx2txtLoader(file_path)
    elif file_path.endswith('.html'):
        loader = UnstructuredHTMLLoader(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_path}")

    documents = loader.load()
    return text_splitter.split_documents(documents)

def index_document_to_chroma(file_path: str, file_id: int) -> bool:
    try:
        splits = load_and_split_document(file_path)

        # Add metadata to each split
        for split in splits:
            split.metadata['file_id'] = file_id

        vectorstore.add_documents(splits)
        
        # Save chunks to SQLite for serverless persistence across cold starts
        chunk_texts = [split.page_content for split in splits]
        insert_document_chunks(file_id, chunk_texts)
        return True
    except Exception as e:
        print(f"Error indexing document: {e}")
        return False
    
def delete_doc_from_chroma(file_id: int):
    try:
        docs = vectorstore.get(where={"file_id": file_id})
        print(f"Found {len(docs['ids'])} document chunks for file_id {file_id}")

        vectorstore._collection.delete(where={"file_id": file_id})
        delete_document_chunks_by_file_id(file_id)
        print(f"Deleted all documents with file_id {file_id}")

        return True
    except Exception as e:
        print(f"Error deleting document with file_id {file_id} from Chroma: {str(e)}")
        return False