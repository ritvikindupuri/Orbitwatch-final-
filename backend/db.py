from flask import g
from pymongo import MongoClient
import os
import mongomock

# Global variable to hold the mock client so it persists across requests during testing
_mock_client = None

def get_db():
    global _mock_client
    if 'db' not in g:
        if os.environ.get('TESTING') == 'True':
            if _mock_client is None:
                _mock_client = mongomock.MongoClient()
            g.client = _mock_client
            g.db = g.client.orbitwatch
        else:
            uri = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/orbitwatch')
            # In a real app, we wouldn't want to create a new client every request if we can avoid it,
            # but Flask's g object is per-request. Typically one creates the client at app startup
            # or uses a connection pool. MongoClient does pooling automatically.
            # Creating it here is fine for this scale, but ideal is to have it created once.
            g.client = MongoClient(uri, serverSelectionTimeoutMS=2000)
            g.db = g.client.get_database()

    return g.db

def close_db(e=None):
    # We don't close the mock client to persist data
    if os.environ.get('TESTING') != 'True':
        client = g.pop('client', None)
        if client is not None:
            client.close()

def init_db(app):
    app.teardown_appcontext(close_db)
