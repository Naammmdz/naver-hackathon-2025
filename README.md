# DevHolic - Naver Hackathon 2025

![DevHolic Logo](logo.png)

> **DevHolic** is an AI-powered collaborative workspace designed for developers. It seamlessly integrates real-time collaboration with advanced AI assistance to streamline your workflow, from planning to coding.

## 🚀 Key Features

*   **Real-time Collaboration:** Work together on documents and boards in real-time, powered by Yjs and Hocuspocus. See changes instantly as your team types.
*   **AI-Powered Assistance:** Integrated AI chat with RAG (Retrieval-Augmented Generation) capabilities. The AI understands your project context, documents, and tasks.
*   **Workspace Management:** Organize your projects into Workspaces, Boards, and Tasks.
*   **Rich Text Editing:** Powerful block-based editor for documentation and planning.
*   **Full-Text Search:** Fast and accurate search across all your content using Elasticsearch.
*   **Secure Authentication:** User management and authentication powered by Clerk.

## 🛠 Technology Stack

### Frontend
*   **Framework:** React 18 with Vite
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS, Mantine UI, Radix UI
*   **State Management:** Zustand, TanStack Query
*   **Real-time:** Yjs, Hocuspocus Provider
*   **Editor:** BlockNote

### Backend Core
*   **Framework:** Java Spring Boot 3
*   **Database:** PostgreSQL (Core Data)
*   **Search:** Elasticsearch
*   **Cache:** Redis
*   **Build Tool:** Maven

### Backend AI Service
*   **Framework:** Python FastAPI
*   **AI/ML:** LangChain, LangGraph
*   **Vector DB:** PGVector
*   **PDF Parsing:** PyMuPDF / Docling
*   **Embeddings:** Naver CLOVA / HuggingFace

### Infrastructure
*   **Containerization:** Docker, Docker Compose
*   **WebSocket Server:** Hocuspocus (Node.js)

## 🏁 Getting Started

### Prerequisites

Ensure you have the following installed:
*   **Docker** & **Docker Compose**
*   **Node.js** (v18+)
*   **Java** (JDK 17+)
*   **Python** (3.10+)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/naver-hackathon-2025.git
    cd naver-hackathon-2025
    ```

2.  **Environment Setup:**
    The project comes with default configurations for local development. Check the `.env` files in each service directory if you need to customize settings.

### Running the Application

We provide a convenient script to start all services at once:

```bash
./start-all.sh
```

This script will:
1.  Check for necessary tools (Docker, Java, Node, Python).
2.  Start Docker containers (Postgres, Redis, Elasticsearch).
3.  Wait for databases to be ready.
4.  Launch the Backend AI Service, Backend Core Service, Hocuspocus Server, and Frontend.

### Accessing the Services

Once started, you can access the application and services at:

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend** | `http://localhost:5173` | Main Web Application |
| **Backend Core** | `http://localhost:8989` | Core API Service |
| **Backend AI** | `http://localhost:8000` | AI Service & Docs |
| **Hocuspocus** | `ws://localhost:1234` | WebSocket Server |

## 📂 Project Structure

```
naver-hackathon-2025/
├── backend-ai-service/    # Python FastAPI service for AI & RAG
├── backend-core-service/  # Java Spring Boot core application
├── frontend/              # React frontend application
├── hocuspocus-server/     # Node.js WebSocket server for real-time sync
├── email-service/         # Node.js service for email notifications
├── docker-compose.yml     # Docker services configuration
├── start-all.sh           # Startup script
└── README.md              # Project documentation
```

## 🤝 Contributing

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the MIT License.
