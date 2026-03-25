# STRUCTURE

## Root Files
*   `main.py`: Entrypoint for the FastAPI application. Sets up middleware, mounts static files, and initializes the `.env` configuration.
*   `config.py`: Configuration class managing Azure variables and local setup parameters.
*   `database.py`: SQLAlchemy setup, mappings, and database configuration functions.
*   `auth.py`: JWT-based custom authentication logic.
*   `jobs.py`: Background thread scheduling and job definitions.
*   `seed_data.py`: CLI script for pre-populating the database (topographies).

## Directories
*   `pipeline/`: Contains core verification logic (`verifier.py`, `router.py`, `orchestrator.py`). This is the system's "brain".
*   `frontend/`: The React 19 / Vite 6 codebase.
    *   `src/`: Front-end source code containing components, pages, visualisations, lib utilities, and AppShell layout.
*   `templates/`: Legacy Jinja2 HTML files (currently being phased out by the SPA).
*   `static/`: Static assets for the backend server.
*   `infra/`: Infrastructure deployments and setup logic.
