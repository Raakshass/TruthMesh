import asyncio
import os
import sys

# Add current dir to path to import database safely
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from database import create_user, init_db, get_user_by_username
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed():
    await init_db()
    
    # demo user
    existing = await get_user_by_username("demo")
    if not existing:
        hashed = pwd_context.hash("demo")
        await create_user("demo", hashed, role="Viewer")
        print("Created demo user in Cosmos DB")
    else:
        print("demo user already exists")
        
    # admin user
    existing_admin = await get_user_by_username("admin")
    if not existing_admin:
        hashed_admin = pwd_context.hash("admin")
        await create_user("admin", hashed_admin, role="Admin")
        print("Created admin user in Cosmos DB")
    else:
        print("admin user already exists")

if __name__ == "__main__":
    asyncio.run(seed())
