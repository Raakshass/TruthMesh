import asyncio
from dotenv import load_dotenv
load_dotenv()
from config import Config
from database import init_db, db

async def check_users():
    await init_db()
    cursor = db.users.find({})
    async for user in cursor:
        print(user)

if __name__ == "__main__":
    asyncio.run(check_users())
