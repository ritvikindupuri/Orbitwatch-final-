# OrbitWatch: AI-Powered Space Domain Awareness (SDA) Platform

**OrbitWatch** is a cutting-edge, client-side application designed to simulate the capabilities of a Space Operations Center (SpOC). It ingests real orbital telemetry (TLE data), visualizes assets on an interactive 3D globe, and employs a browser-based Deep Autoencoder to detect station-keeping anomalies and potential cyber-kinetic threats in real-time.

For a deep dive into the mathematics, detailed component breakdown, and ML architecture, please read the file titled "Orbitwatch Documentation"

---

## Technology Stack

OrbitWatch utilizes a modern, "Thick Client" stack to deliver high-performance physics and AI without server-side latency.

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | **React 19 (Vite)** | Component lifecycle, State management, HMR. |
| **Machine Learning** | **TensorFlow.js** | Runs the Deep Autoencoder model on the GPU via WebGL. |
| **Orbital Physics** | **Satellite.js** | SGP4/SDP4 propagation algorithms for real-time tracking. |
| **Visualization** | **React-Map-GL** | High-performance Mapbox GL JS wrapper for 3D rendering. |
| **Styling** | **Tailwind CSS** | Utility-first styling for the mission-control aesthetic. |
| **Data Source** | **Space-Track.org** | Real-world TLE (Two-Line Element) catalog data. |
| **Cloud Integration**| **Anvil Uplink** | Secure bridge between local backend logic and cloud dashboards. |

---

## System Architecture

OrbitWatch has migrated from a traditional Client-Server model to a **Thick Client** architecture. This ensures zero latency in orbital propagation and protects data privacy by running machine learning inference directly within the user's browser sandbox.

### Architectural Overview
The diagram below illustrates the complete component interaction model. Note how the **Browser Runtime** encapsulates the entire logic stack—including the Physics Engine (SGP4) and the AI Inference Engine (TensorFlow.js)—isolating it from external network dependencies after the initial data fetch.

<p align="center">
  <img src="https://i.imgur.com/cu6xW8n.png" alt="System Architecture" width="400" />
  <br>
  <b>Figure 1: High-Level System Architecture & Client-Side Sandbox Boundary</b>
</p>

---

## Machine Learning Strategy

Unlike rule-based systems, OrbitWatch uses **Unsupervised Learning**. We do not tell the model what an anomaly looks like; instead, we teach it what "normal" orbital physics look like, and it flags anything that breaks those laws.

**Key Strategies:**
1.  **Deep Autoencoder:** We utilize a sequential neural network to learn the manifold of Keplerian physics.
2.  **GEO-Centric Specialization (100 Satellites):** The model is trained on a live dataset of the top **100 Objects** in the Geostationary Belt.
    * *Why 100?* For **Spatial Analysis** (Population-Based Anomaly Detection), a snapshot of 100 synchronized satellites is statistically sufficient to define the "Normal Manifold." If 99 satellites are stationary and 1 is drifting, the model detects the outlier without needing months of historical data. (See *Technical Docs Section 3.6* for full mathematical justification).
3.  **Information Bottleneck:** A 3-neuron latent space forces the model to learn structural correlations rather than memorizing noise.

---

## Data Flow & API Integration

The application prioritizes real data but is built to be resilient against browser security restrictions.

### Logic Flowchart
The diagram below details the ingestion lifecycle. It visualizes the path from User Credentials to Space-Track Authentication.

<p align="center">
  <img src="https://i.imgur.com/ceADblA.png" alt="Data Flow" width="400" />
  <br>
  <b>Figure 2: Ingestion Logic & CORS Mechanism</b>
</p>

---

## Data Persistence & Database

While OrbitWatch operates as a stateless client-side application by default (Architecture V1), a production-ready **PostgreSQL Schema** is provided for teams requiring historical data persistence and collaborative features.

* **Schema Location:** `database/schema.sql`
* **Architecture:** Designed for **Supabase (PostgreSQL)** to leverage built-in Real-Time subscriptions and Vector Search capabilities.
* **Capabilities:** Enables long-term TLE storage for Temporal Analysis (Phase 3 LSTM models) and multi-user operator annotation sync.
* **Documentation:** See **Section 8** of the [Technical Documentation](TECHNICAL_DOCS.md) for the complete schema design and integration strategy.

---

## Setup & Installation Guide

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** or **yarn**
* **Python 3.x** (For Anvil backend integration)

### Phase 1: Frontend Initialization

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/your-org/orbit-watch.git](https://github.com/your-org/orbit-watch.git)
    cd orbit-watch
    ```

2.  **Install Dependencies**
    This installs React, Mapbox GL, TensorFlow.js, and Satellite.js.
    ```bash
    npm install
    ```

3.  **Run Development Server**
    OrbitWatch uses Vite for instant HMR (Hot Module Replacement).
    ```bash
    npm run dev
    ```

4.  **Access the App**
    Open `http://localhost:5173` in your browser.

5.  **Login**
    * **Credentials:** Enter valid Space-Track.org credentials.
    * **Mapbox:** The app will request a Mapbox Public Token for the 3D visualization layer.

### Phase 2: Anvil Integration (Hybrid Cloud Dashboard)

To expose your local OrbitWatch calculations to a public web dashboard without deploying a full server, we utilize **Anvil Uplink**. This creates a secure tunnel between your local Python backend and the Anvil cloud.

<p align="center">
  <img src="https://anvil.works/docs/uplink/img/uplink-architecture.png" alt="Anvil Uplink Architecture" width="600" />
</p>

#### 1. Create the Anvil App
1.  Navigate to [anvil.works](https://anvil.works) and create a free account.
2.  Click **New Blank App** and select **Material Design**.
3.  In the editor sidebar, click the **App Browser** (folder icon) or the **+** button next to Services.
4.  Add the **Uplink** service.
5.  Click the **Enable Server Uplink** button.
6.  **Copy the Uplink Key** shown on the screen (it starts with `server_...`).

#### 2. Configure Your OrbitWatch Backend
Open your terminal in the project root to configure the local environment.

1.  **Install the Uplink Library:**
    ```bash
    pip install anvil-uplink
    ```

2.  **Set Your Uplink Key:**
    Replace `server_YourKeyHere` with the key you copied in the previous step.

    *Linux/Mac:*
    ```bash
    export ANVIL_UPLINK_KEY="server_YourKeyHere"
    ```

    *Windows (CMD):*
    ```cmd
    set ANVIL_UPLINK_KEY="server_YourKeyHere"
    ```

    *Windows (PowerShell):*
    ```powershell
    $env:ANVIL_UPLINK_KEY="server_YourKeyHere"
    ```

3.  **Start the Integration Service:**
    ```bash
    python3 backend/anvil_service.py
    ```
    *Wait until you see the success message: "Anvil Uplink Connected. Waiting for requests..."*

#### 3. Build the UI (Anvil Editor)
Return to the Anvil Editor in your browser to consume the local data.

1.  Drag a **Repeating Panel** (or Data Grid) onto the visual designer (`Form1`).
2.  Double-click the background to open the **Code** view (`Form1.py`).
3.  Modify the `__init__` method to fetch data from your local machine:

    ```python
    import anvil.server
    from ._anvil_designer import Form1Template

    class Form1(Form1Template):
      def __init__(self, **properties):
        self.init_components(**properties)

        # This calls the function running on YOUR local computer!
        # "get_recent_tles" matches the function name in backend/anvil_service.py
        data = anvil.server.call('get_recent_tles', limit=10)

        # Assign data to your grid
        self.repeating_panel_1.items = data
    ```

4.  Click the **Run** button in Anvil. You should immediately see data from your local OrbitWatch instance appear in the cloud web app.

---

## Conclusion

OrbitWatch demonstrates a high level of proficiency in modern frontend engineering and applied artificial intelligence. By moving the entire computation stack—including the Machine Learning training loop and orbital physics engine—to the client, we have achieved:

1.  **Scalability:** The backend is effectively serverless; the user's machine handles the compute.
2.  **Latency:** Anomaly detection happens in milliseconds without network round-trips.
3.  **Privacy:** Sensitive orbital analysis logic runs locally.
4.  **Visual Fidelity:** Utilizing WebGL for cinema-grade visualization of complex datasets.

This project serves as a proof-of-concept for next-generation Space Domain Awareness tools that leverage the full power of the modern web platform.
