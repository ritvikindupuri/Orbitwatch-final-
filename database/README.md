# Database Schema Documentation
+
+This directory contains documentation for the MongoDB schema used in OrbitWatch.
+
+## Overview
+
+OrbitWatch uses **MongoDB** as its primary data store. While MongoDB is schema-less, the application relies on specific field structures to function correctly. The backend code (`backend/db.py`) enforces indexing for performance.
+
+## Collections
+
+### 1. `tle_data`
+Stores snapshots of TLE (Two-Line Element) data fetched from Space-Track or other sources. This allows for historical analysis.
+
+```json
+{
+  "_id": ObjectId("..."),
+  "NORAD_CAT_ID": 12345,         // Integer
+  "OBJECT_NAME": "SATELLITE 1",  // String
+  "TLE_LINE1": "1 12345U ...",   // String
+  "TLE_LINE2": "2 12345 ...",    // String
+  "stored_at": ISODate("..."),   // Date (Time of insertion)
+  "epoch": "2023-10-01T..."      // String/Date (Epoch of the TLE)
+}
+```
+**Indexes:**
+*   `NORAD_CAT_ID` (1)
+*   `stored_at` (-1)
+*   `OBJECT_NAME` (1)
+
+### 2. `sessions`
+Stores user session information.
+
+```json
+{
+  "_id": ObjectId("..."),
+  "username": "user1",           // String
+  "created_at": ISODate("..."),  // Date
+  "active": true                 // Boolean
+}
+```
+**Indexes:**
+*   `created_at` (-1)
+
+### 3. `api_logs`
+Stores logs of API requests for auditing and debugging.
+
+```json
+{
+  "_id": ObjectId("..."),
+  "timestamp": ISODate("..."),   // Date
+  "method": "POST",              // String
+  "path": "/api/tle",            // String
+  "status_code": 201,            // Integer
+  "duration_seconds": 0.123,     // Float
+  "ip": "127.0.0.1",             // String
+  "user_agent": "Mozilla/5.0...",// String
+  "content_length": 500          // Integer (Optional)
+}
+```
+**Indexes:**
+*   `timestamp` (-1)
+*   `path` (1)
+