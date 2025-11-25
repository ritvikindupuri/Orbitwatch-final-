import anvil.server
import os
from db import get_db, init_db
from flask import Flask
from datetime import datetime

# We need a Flask app context to use the get_db() function from db.py
# because it relies on 'g' (flask.g) or we can adapt it.
# However, db.py uses 'g' which is bound to a request/app context.
# To make this robust for a standalone script, we can create a minimal app context.

app = Flask(__name__)
# Initialize DB settings (mock vs real)
with app.app_context():
    # We can rely on the same environment variables as the main app
    pass

@anvil.server.callable
def get_recent_tles(limit=50):
    """
    Fetches the most recent TLE records from the local MongoDB.
    """
    print(f"Anvil called get_recent_tles with limit={limit}")
    with app.app_context():
        db = get_db()
        cursor = db.tle_data.find().sort("stored_at", -1).limit(limit)

        results = []
        for doc in cursor:
            # Convert ObjectId and datetime to strings/compatible types for Anvil
            doc['_id'] = str(doc['_id'])
            if 'stored_at' in doc:
                doc['stored_at'] = doc['stored_at'].isoformat()
            results.append(doc)

        return results

@anvil.server.callable
def get_system_logs(limit=20):
    """
    Fetches recent API logs for monitoring.
    """
    print(f"Anvil called get_system_logs with limit={limit}")
    with app.app_context():
        db = get_db()
        cursor = db.api_logs.find().sort("timestamp", -1).limit(limit)

        results = []
        for doc in cursor:
            doc['_id'] = str(doc['_id'])
            if 'timestamp' in doc:
                doc['timestamp'] = doc['timestamp'].isoformat()
            results.append(doc)

        return results

@anvil.server.callable
def search_satellite(norad_id):
    """
    Searches for a specific satellite by NORAD ID.
    """
    print(f"Anvil searching for NORAD ID: {norad_id}")
    with app.app_context():
        db = get_db()
        cursor = db.tle_data.find({"NORAD_CAT_ID": int(norad_id)}).sort("stored_at", -1)

        results = []
        for doc in cursor:
            doc['_id'] = str(doc['_id'])
            if 'stored_at' in doc:
                doc['stored_at'] = doc['stored_at'].isoformat()
            results.append(doc)

        return results

def start_anvil_service():
    key = os.environ.get('ANVIL_UPLINK_KEY')
    if not key:
        print("Error: ANVIL_UPLINK_KEY environment variable not set.")
        print("Please set it to your Anvil Server Uplink key.")
        return

    print("Connecting to Anvil...")
    anvil.server.connect(key)
    print("Anvil Uplink Connected. Waiting for requests...")
    # This will block forever, keeping the script alive
    anvil.server.wait_forever()

if __name__ == "__main__":
    start_anvil_service()
