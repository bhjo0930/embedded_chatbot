# n8n Workflows for Chrome Extension AI Chatbot

This directory contains the n8n workflows that power the backend logic for the Chrome Extension AI Chatbot.

## Workflows

- **`workflows/embedded_chat.json`**: The main workflow that handles both the chat functionality and the document embedding process.

## Workflow Overview: `embedded_chat.json`

This workflow is designed with two primary functions: a RAG (Retrieval-Augmented Generation) powered chatbot and a document processing pipeline for populating the knowledge base.

### 1. RAG-based Chatbot

This is the core interactive component. It receives user queries and provides answers based on a knowledge base stored in a vector database.

**Key Nodes & Flow:**

- **Trigger**: The workflow can be initiated via:
    - `Webhook`: Receives `message` and `category` from the Chrome extension.
    - `When chat message received`: A dedicated chat trigger.
    - `Manual Trigger`: For testing purposes.
- **`AI Agent`**: The central brain of the chatbot. It uses the `qwen3:4b` model via Ollama to understand the user's prompt.
- **`Simple Memory`**: Remembers the conversation history to provide contextually relevant answers.
- **`Qdrant_Vector_Store` (as a Tool)**: The AI Agent's primary tool. It searches the Qdrant vector database for documents relevant to the user's question within a specific `category`.
- **`Code Node (추론 태그 제거)`**: A custom code node that parses the AI's response, separating the reasoning (`<think>` tags) from the final answer.
- **`Respond to Webhook`**: Sends the final, cleaned answer back to the user.

### 2. Document Embedding and Storage

This part of the workflow is responsible for building and maintaining the knowledge base that the chatbot relies on.

**Key Nodes & Flow:**

- **`On form submission` (Trigger)**: Allows uploading documents (`.pdf`, `.docx`, `.xlsx`, etc.) and assigning a `category` (e.g., HR, IT).
- **`Code Node (파일 기준 기존 데이터 삭제)`**: A crucial pre-processing step. Before adding a new document, this node connects to Qdrant directly to find and delete any existing data associated with the same filename. This prevents data duplication and ensures the knowledge base is up-to-date.
- **`Default Data Loader` & `Token Splitter`**: The uploaded document is loaded and split into smaller, manageable chunks of text.
- **`Embeddings Ollama`**: Uses the `bge-m3:latest` model to convert the text chunks into vector embeddings.
- **`Qdrant Vector Store` (Insert Mode)**: The generated embeddings are then saved into the appropriate collection within the Qdrant database, based on the specified `category`.

## Setup & Dependencies

- **n8n**: This workflow is built on a recent version of n8n.
- **Ollama**: Required for running the language models (`qwen3:4b`) and the embedding models (`bge-m3:latest`).
- **Qdrant**: A vector database used for storing and retrieving document embeddings.

To use this workflow, you will need to configure the credentials for Ollama and Qdrant within your n8n instance.
