# NotesLM - Student Notes RAG Assistant

An AI-powered assistant that lets students upload their notes and ask questions about them. Built using a Retrieval-Augmented Generation (RAG) pipeline, so answers come directly from the uploaded content instead of the model's general knowledge.

## Features

- Upload notes as PDF, DOCX, or TXT files
- Automatic chunking and embedding of uploaded content
- Ask natural-language questions and get answers grounded in your own notes
- Clean, interactive chat-style interface with real-time status feedback
- Falls back to "I could not find the answer in the document" when the notes don't contain the answer, instead of hallucinating

## Tech Stack

**Backend**
- FastAPI — REST API for upload and query endpoints
- LangChain — RAG orchestration (loading, splitting, retrieval, prompting)
- ChromaDB — local vector store for document embeddings
- Hugging Face `sentence-transformers/all-MiniLM-L6-v2` — embeddings (runs locally, no API cost)
- Hugging Face Inference API (`deepseek-ai/DeepSeek-V3-0324`) — answer generation

**Frontend**
- React (Vite)
- Custom CSS design system, no UI framework dependency
- Fetch API for communicating with the backend

## Project Structure

```
NotesLM/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env            (not committed — see setup below)
│   ├── uploads/         (not committed)
│   └── chroma_db/       (not committed)
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   └── App.css
    └── package.json
```

## How It Works

1. User uploads a notes file through the React frontend.
2. FastAPI saves the file, loads its text, splits it into chunks, and embeds each chunk into a local Chroma vector database.
3. User asks a question in the chat interface.
4. The backend retrieves the most relevant chunks (MMR retrieval for diverse, non-redundant context) and passes them, along with the question, to the LLM.
5. The LLM generates an answer strictly from the retrieved context and returns it to the frontend.

## Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- A free Hugging Face account and access token ([huggingface.co](https://huggingface.co) → Settings → Access Tokens, with "Make calls to Inference Providers" enabled)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
```

Create a `.env` file inside `backend/`:
```
HUGGINGFACEHUB_API_TOKEN=your_token_here
```

Run the server:
```bash
uvicorn main:app --reload
```
Backend runs at `http://localhost:8000`. API docs available at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

## Usage

1. Start both the backend and frontend servers (see above).
2. Open `http://localhost:5173` in your browser.
3. Upload a notes file and wait for the "indexed" confirmation.
4. Type a question about the notes and press Ask (or Enter).
5. The assistant responds using only the content from your uploaded file.

## Notes / Limitations

- Embeddings run locally (no rate limits); answer generation uses Hugging Face's free Inference API, which may occasionally rate-limit under heavy use.
- Re-uploading the same file will add duplicate chunks to the vector store in the current version.
- This is a local-first project; no deployment is included, but it can be hosted on Vercel (frontend) and Render/Railway (backend) with minor config changes.

## Author

Ashish Kumar
