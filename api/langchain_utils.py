import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_classic.chains import create_history_aware_retriever, create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from typing import List
from langchain_core.documents import Document
from chroma_utils import vectorstore, ensure_vectorstore_populated

output_parser = StrOutputParser()

contextualize_q_system_prompt = (
    "Given a chat history and the latest user question "
    "which might reference context in the chat history, "
    "formulate a standalone question which can be understood "
    "without the chat history. Do NOT answer the question, "
    "just reformulate it if needed and otherwise return it as is."
)

contextualize_q_prompt = ChatPromptTemplate.from_messages([
    ("system", contextualize_q_system_prompt),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
])

qa_system_prompt = (
    "You are an expert Document Analysis AI assistant. "
    "Your goal is to provide accurate, comprehensive, and well-structured answers based on the retrieved document context below.\n\n"
    "Guidelines:\n"
    "1. Use the provided context to thoroughly answer the user's question or summarize key points.\n"
    "2. If the user asks for a summary or takeaways, extract the main topics, key facts, and conclusions from the context into clear bullet points.\n"
    "3. Be helpful, articulate, and direct.\n\n"
    "Context:\n{context}"
)

qa_prompt = ChatPromptTemplate.from_messages([
    ("system", qa_system_prompt),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}")
])

def get_rag_chain(model="llama-3.3-70b-versatile"):
    ensure_vectorstore_populated()
    retriever = vectorstore.as_retriever(search_kwargs={"k": 6})
    llm = ChatGroq(model=model)
    history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)    
    return rag_chain