import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

_client = None

def get_mongo_db():
    global _client
    if _client is None:
        _client = MongoClient(os.getenv("MONGO_URI"))
    return _client["casevault"]
