from flask import g
from pymongo import MongoClient, ASCENDING, DESCENDING
import os
import mongomock

# Global variables to hold the clients so they persist across requests
_mock_client = None
_real_client = None

def get_db():
    global _mock_client, _real_client

    if 'db' not in g:
        if os.environ.get('TESTING') == 'True':
            if _mock_client is None:
                _mock_client = mongomock.MongoClient()
            g.db = _mock_client.orbitwatch
        else:
            if _real_client is None:
                uri = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/orbitwatch')
                # Instantiate the client once. MongoClient handles pooling.
                # serverSelectionTimeoutMS ensures we don't hang forever if DB is down at startup
                _real_client = MongoClient(uri, serverSelectionTimeoutMS=2000)

            g.db = _real_client.get_database()

    return g.db

def create_indexes(app):
    """Creates indexes for collections to support scaling."""
    with app.app_context():
        db = get_db()
        # TLE Data Indexes
        db.tle_data.create_index([("NORAD_CAT_ID", ASCENDING)])
        db.tle_data.create_index([("stored_at", DESCENDING)])
        db.tle_data.create_index([("OBJECT_NAME", ASCENDING)])

        # Session Indexes
        db.sessions.create_index([("created_at", DESCENDING)])

        # API Logs Indexes
        db.api_logs.create_index([("timestamp", DESCENDING)])
        db.api_logs.create_index([("path", ASCENDING)])

def close_db(e=None):
    # With a shared client, we do NOT want to close the connection on every request.
    # MongoClient manages the connection pool automatically.
    pass

def init_db(app):
    app.teardown_appcontext(close_db)
    # We can create indexes at startup
    create_indexes(app)
