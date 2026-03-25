# STACK

## Backend
*   **Language:** Python 3.12+
*   **Framework:** FastAPI
*   **Database:** SQLite (`truthmesh.db`) with SQLAlchemy ORM
*   **Server:** Uvicorn
*   **Security:** JWT (JSON Web Tokens) with Base64 encoding for passwords (legacy, needs bcrypt)

## Frontend
*   **Language:** TypeScript
*   **Framework:** React 19
*   **Build Tool:** Vite 6
*   **Styling:** Tailwind CSS v4 (Custom design tokens, semantic layering)
*   **Icons:** Lucide React
*   **Visualizations:** `react-force-graph-3d`, `react-three-fiber`

## Infrastructure
*   **Containerization:** Docker (`Dockerfile` present) 
*   **Deployment:** Azure App Service (`startup.sh`, `package_app.ps1` scripts)
*   **Environment:** Managed via `.env` files (Azure OpenAI, API keys)
