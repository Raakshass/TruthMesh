"""Authentication and Identity Access Management (IAM) for TruthMesh.

Implements JWT-based authentication and Role-Based Access Control (RBAC).
Designed to be swappable with Azure Active Directory (MSAL) for production.
"""
from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
import os

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "b4cf82c81fb2b87e914e6b2c0199042b0c363f88f1dc815f9b40742d31c4f526")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


def verify_password(plain_password, hashed_password):
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False


def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_token_from_request(request: Request, token: str = Depends(oauth2_scheme)):
    """Extract token from Authorization header OR cookies (for web UI)."""
    if token:
        return token
    
    cookie_token = request.cookies.get("access_token")
    if cookie_token and cookie_token.startswith("Bearer "):
        return cookie_token.split(" ")[1]
    
    return None


async def get_current_user(token: str = Depends(get_token_from_request)):
    """Validate JWT and retrieve user information."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_303_SEE_OTHER,
            headers={"Location": "/login"}
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        user_id: int = payload.get("uid")
        
        if username is None or role is None or user_id is None:
            raise credentials_exception
            
        return {"username": username, "role": role, "user_id": user_id}
    except JWTError:
        raise credentials_exception


def require_role(allowed_roles: List[str]):
    """Dependency for Role-Based Access Control (RBAC)."""
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of: {', '.join(allowed_roles)}"
            )
        return current_user
    return role_checker
