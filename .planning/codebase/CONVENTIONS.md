# CONVENTIONS

## Backend (Python)
*   **Type Hinting:** Extensive use of Python type checking (Pydantic models, `typing`).
*   **Async/Await:** The entire FastApi flow and verification API requests must be asynchronous to prevent blocking. Use `aiohttp` for external API requests, not synchronous `requests`.
*   **Response Format:** JSON-only structure. Previous Jinja2 templating is deprecated.
*   **Errors:** Standardized `HTTPException` usage.

## Frontend (React/TypeScript)
*   **Component Structure:** Functional components with Hooks.
*   **Styling:** Tailwind CSS utility classes inside `className`.
*   **State Management:** React Context API (e.g., `AuthContext`). No external state managers like Redux.
*   **Type Safety:** Strict TypeScript interfaces for all components and API responses.
