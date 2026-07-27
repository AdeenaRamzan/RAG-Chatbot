# 🧠 Conversational RAG Chatbot

An ultra-fast, modern **Retrieval-Augmented Generation (RAG)** chatbot powered by **Groq AI**, **LangChain**, **HuggingFace Embeddings**, and **FastAPI**. Features a sleek, custom **Dark Glassmorphic UI** with document drag-and-drop upload and real-time conversational memory.

---

## ⚡ Key Features

- **🚀 Ultra-Fast Inference via Groq**: Powered by `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, and `mixtral-8x7b-32768`.
- **✨ Custom Glassmorphism UI**: Built with modern CSS/JS featuring responsive design, dark mode, smooth message animations, auto-scrolling, and markdown support.
- **📄 Document Management**: Drag-and-drop support for **PDF**, **DOCX**, and **HTML** files with live status and delete controls.
- **🆓 100% Free Vector Embeddings**: Utilizes HuggingFace's `all-MiniLM-L6-v2` via `sentence-transformers` for local vector storage in ChromaDB.
- **💬 Conversational Memory**: Preserves context and session history across follow-up queries.
- **⚡ Vercel Ready**: Pre-configured `vercel.json` for 1-click free serverless deployment.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) |
| **LLM Provider** | [Groq AI](https://groq.com/) (`ChatGroq`) |
| **Orchestration** | [LangChain](https://www.langchain.com/) |
| **Embeddings** | [HuggingFace](https://huggingface.co/) (`all-MiniLM-L6-v2`) |
| **Vector Storage** | [ChromaDB](https://www.trychroma.com/) |
| **Frontend** | Custom HTML5, Vanilla CSS3 (Glassmorphism), ES6+ JavaScript |
| **Database** | SQLite (`rag_app.db`) for chat logs & metadata |

---

## 📦 Project Structure

```
RAG-CHATBOT/
├── api/                         # FastAPI backend server
│   ├── chroma_utils.py          # Document loader & ChromaDB vector store logic
│   ├── db_utils.py              # SQLite session & chat history management
│   ├── langchain_utils.py       # LangChain RAG pipeline with Groq LLM
│   ├── main.py                  # FastAPI server & route handlers
│   └── pydantic_models.py       # Request/Response schemas
├── frontend/                    # Custom Web UI
│   ├── index.html               # Main application template
│   ├── style.css                # Glassmorphic dark design system
│   └── script.js                # Frontend API client & interactive UI
├── docs/                        # Sample documents
├── documentation/               # Documentation guides
├── .env                         # Environment variables
├── .env.example                 # Example configuration
├── vercel.json                  # Vercel deployment configuration
├── requirements.txt             # Python dependencies
└── README.md                    # Project documentation
```

---

## ⚙️ Configuration & Setup

### 1. Prerequisites
- Python 3.9 or higher
- A free **Groq API Key** (Get one at [console.groq.com](https://console.groq.com))

### 2. Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/rag-chatbot.git
   cd rag-chatbot
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   
   # Optional LangSmith Tracing
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_API_KEY=your_langsmith_api_key_here
   LANGCHAIN_PROJECT="rag-chatbot"
   ```

---

## 🚀 Quick Start

Run the unified application server:

```bash
cd api
python -m uvicorn main:app --reload --port 8000
```

Open your browser and visit:
👉 **[http://localhost:8000](http://localhost:8000)**

*(Swagger API Documentation available at [http://localhost:8000/docs](http://localhost:8000/docs))*

---

## 🌐 Deploy to Vercel (100% Free)

This project includes built-in Vercel Serverless support (`vercel.json`).

### Deploy via GitHub:
1. Push your code to a GitHub repository.
2. Go to **[vercel.com/new](https://vercel.com/new)** and import your repository.
3. Add the Environment Variable:
   - `GROQ_API_KEY`: `your_groq_api_key`
4. Click **Deploy**.

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/` | `GET` | Serves the main web interface |
| `/chat` | `POST` | Processes user questions via RAG chain |
| `/upload-doc` | `POST` | Uploads and indexes PDF/DOCX/HTML documents |
| `/list-docs` | `GET` | Returns list of currently indexed documents |
| `/delete-doc` | `POST` | Deletes a document from vector store and DB |

---

## 📜 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
