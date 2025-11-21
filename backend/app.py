from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from db import init_db, get_db
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)

# Configuration
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/orbitwatch')
app.config['MONGO_URI'] = MONGO_URI

# Initialize DB
init_db(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}), 200

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data or 'username' not in data:
        return jsonify({"error": "Missing username"}), 400

    username = data['username']
    # In a real app, we'd verify password here.
    # For this task, we just create a session.

    db = get_db()
    session = {
        "username": username,
        "created_at": datetime.now(timezone.utc),
        "active": True
    }
    result = db.sessions.insert_one(session)

    return jsonify({"message": "Login successful", "session_id": str(result.inserted_id)}), 200

@app.route('/api/tle', methods=['POST'])
def store_tle():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Expecting a list of TLE objects or a single object
    if isinstance(data, list):
        tles = data
    else:
        tles = [data]

    # Validate TLEs
    valid_tles = []
    for tle in tles:
        if 'NORAD_CAT_ID' in tle and 'TLE_LINE1' in tle and 'TLE_LINE2' in tle:
            tle['stored_at'] = datetime.now(timezone.utc)
            valid_tles.append(tle)

    if not valid_tles:
        return jsonify({"error": "No valid TLEs found"}), 400

    db = get_db()
    result = db.tle_data.insert_many(valid_tles)

    return jsonify({"message": f"Stored {len(result.inserted_ids)} TLE records"}), 201

@app.route('/api/tle', methods=['GET'])
def get_tle():
    norad_id = request.args.get('norad_id')
    limit = int(request.args.get('limit', 100))

    query = {}
    if norad_id:
        query['NORAD_CAT_ID'] = int(norad_id)

    db = get_db()
    # Sort by stored_at desc
    cursor = db.tle_data.find(query).sort("stored_at", -1).limit(limit)

    results = []
    for doc in cursor:
        doc['_id'] = str(doc['_id'])
        results.append(doc)

    return jsonify(results), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
