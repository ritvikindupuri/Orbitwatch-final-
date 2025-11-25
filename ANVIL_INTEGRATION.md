# Anvil Integration Guide

This guide explains how to connect an [Anvil](https://anvil.works) web application to the OrbitWatch local MongoDB database.

## 1. Concept: "Hosting" vs. "Connecting"

You asked about "hosting MongoDB through Anvil". It is important to clarify the architecture:

*   **Anvil does not host MongoDB.** Anvil has its own built-in database (Data Tables), which is based on PostgreSQL.
*   **Anvil Uplink:** However, Anvil provides a service called **Uplink**. This allows code running on *your* machine (where the MongoDB lives) to connect securely to the Anvil cloud.
*   **The Result:** You can build a dashboard in Anvil (drag-and-drop UI) that displays data living in your local OrbitWatch MongoDB.

## 2. Setup Instructions

### Step A: Create an Anvil App
1.  Go to [anvil.works](https://anvil.works) and log in.
2.  Click **New Blank App** -> **Material Design**.
3.  Click the **Anvil Uplink** button (usually in the Gear icon / Services menu).
4.  Click **Enable Server Uplink**.
5.  Copy the **Uplink Key** (it looks like `server_...`).

### Step B: Configure the Backend
1.  Open the `backend/` directory in this repository.
2.  Install the dependency (already added to requirements.txt):
    ```bash
    pip install anvil-uplink
    ```
3.  Set your key as an environment variable:
    ```bash
    export ANVIL_UPLINK_KEY="your-key-copied-from-step-a"
    ```
4.  Run the integration service:
    ```bash
    python3 anvil_service.py
    ```
    *You should see: "Anvil Uplink Connected. Waiting for requests..."*

### Step C: Build the UI in Anvil
In your Anvil app's client-side code (Form1), you can now call the Python functions running on your local machine:

```python
# In Anvil Client Code
def form_show(self, **event_args):
    # Call the function defined in backend/anvil_service.py
    tles = anvil.server.call('get_recent_tles', limit=10)
    self.repeating_panel_1.items = tles
```

## 3. Available Functions

The following functions are exposed in `backend/anvil_service.py`:

*   **`get_recent_tles(limit=50)`**: Returns the most recently stored TLE snapshots.
*   **`get_system_logs(limit=20)`**: Returns the most recent API access logs (useful for monitoring).
*   **`search_satellite(norad_id)`**: Returns all history for a specific satellite ID.

## 4. Why use this?
This setup allows you to build a secure "Admin Panel" or "Mission Control Dashboard" accessible from anywhere on the internet via Anvil, while keeping your massive TLE dataset securely on your own infrastructure.
