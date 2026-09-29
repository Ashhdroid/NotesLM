import os
import shutil
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from langchain_huggingface import HuggingFaceEmbeddings, HuggingFaceEndpoint, ChatHuggingFace
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Local embeddings — free, no API calls, no rate limit
embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

vectorstore = Chroma(
    persist_directory="./chroma_db",
    embedding_function=embedding_model
)

retriever = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={
        "k": 4,
        "fetch_k": 10,
        "lambda_mult": 0.5
    }
)

# Hugging Face Inference API for generation
llm_endpoint = HuggingFaceEndpoint(
    repo_id="deepseek-ai/DeepSeek-V3-0324",
    task="text-generation",
    max_new_tokens=512,
    temperature=0.3,
)
llm = ChatHuggingFace(llm=llm_endpoint)

prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """You are a helpful AI assistant.

        Use ONLY the provided context to answer the question.

        If the answer is not present in the context,
        say: "I could not find the answer in the document."
        """
    ),
    (
        "human",
        """Context:
        {context}

        Question:
        {question}
        """
    )
])

splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)

def load_document(path: str):
    ext = path.lower().split(".")[-1]
    if ext == "pdf":
        loader = PyPDFLoader(path)
    elif ext == "docx":
        loader = Docx2txtLoader(path)
    else:
        loader = TextLoader(path, encoding="utf-8")
    return loader.load()

def ingest_file(path: str):
    docs = load_document(path)
    chunks = splitter.split_documents(docs)
    vectorstore.add_documents(chunks)
    return len(chunks)

def answer_question(question: str) -> str:
    docs = retriever.invoke(question)
    context = "\n\n".join([doc.page_content for doc in docs])
    final_prompt = prompt.invoke({"context": context, "question": question})
    response = llm.invoke(final_prompt)
    return response.content


class Query(BaseModel):
    question: str

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    path = os.path.join(UPLOAD_DIR, file.filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    n_chunks = ingest_file(path)
    return {"message": f"{file.filename} uploaded and indexed ({n_chunks} chunks)"}

@app.post("/query")
async def query(q: Query):
    return {"answer": answer_question(q.question)}