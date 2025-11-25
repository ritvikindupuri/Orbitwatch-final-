
# OrbitWatch: ML-Powered Space Domain Awareness (SDA) Platform

**OrbitWatch** is a cutting-edge, client-side application designed to simulate the capabilities of a Space Operations Center (SpOC). It ingests real orbital telemetry (TLE data), visualizes assets on an interactive 3D globe, and employs a browser-based Deep Autoencoder to detect station-keeping anomalies and potential cyber-kinetic threats in real-time.

For a deep dive into the mathematics, detailed component breakdown, and ML architecture, please read the [Technical Documentation](TECHNICAL_DOCS.md).

---

## Technology Stack

OrbitWatch utilizes a modern, "Thick Client" stack to deliver high-performance physics and AI without server-side latency.

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | **React 19 (Vite)** | Component lifecycle, State management, HMR. |
| **Machine Learning** | **TensorFlow.js** | Runs the Deep Autoencoder model on the GPU via WebGL. |
| **Orbital Physics** | **Satellite.js** | SGP4/SDP4 propagation algorithms for real-time tracking. |
| **Visualization** | **React-Globe.gl** | High-performance 3D rendering wrapper for Three.js. |
| **Styling** | **Tailwind CSS** | Utility-first styling for the mission-control aesthetic. |
| **Data Source** | **Space-Track.org** | Real-world TLE (Two-Line Element) catalog data. |
| **Database** | **MongoDB** | NoSQL database for flexible storage of TLE data, user sessions, and API logs. |

---

## System Architecture

OrbitWatch utilizes a hybrid **Thick Client** architecture supported by a lightweight **Flask Backend**.
- **Frontend:** Handles orbital propagation and machine learning inference directly in the browser sandbox for zero latency and data privacy.
- **Backend:** A Python Flask service manages data persistence, logging, and user sessions.


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
2.  **GEO-Centric Specialization:** The model training is constrained to the top **100 objects** in the Geostationary Belt. By specifically learning the physics of "perfectly stationary" satellites (Mean Motion ~1.0), the model becomes hyper-sensitive to minute drift anomalies or station-keeping errors in high-value assets.
3.  **Information Bottleneck:** A 3-neuron latent space forces the model to learn structural correlations rather than memorizing noise.

---

## Data Flow & API Integration

The application prioritizes real data but is built to be resilient against browser security restrictions.

### Logic Flowchart
The diagram below details the ingestion lifecycle. It visualizes the path from User Credentials to Space-Track Authentication. Crucially, it depicts the **CORS Fallback Mechanism**, where the system intelligently switches to a cached real-world snapshot if browser security policies block the direct API connection. This ensures that the TensorFlow model *always* receives valid physics data for training, regardless of network conditions.

<p align="center">
  <img src="https://i.imgur.com/ceADblA.png" alt="Data Flow" width="400" />
  <br>
  <b>Figure 2: Ingestion Logic & CORS Fallback Mechanism</b>
</p>

---

## Data Persistence & Database

OrbitWatch integrates with **MongoDB** for robust data persistence. This allows for the storage of historical orbital data, user sessions, and detailed API access logs.

*   **Implementation:** The backend uses `pymongo` for production connections and `mongomock` for testing environments.
*   **Collections:**
    *   `tle_data`: Stores historical Two-Line Element sets for temporal analysis.
    *   `sessions`: Manages user login sessions.
    *   `api_logs`: Tracks all API requests for auditing and performance monitoring.
*   **Documentation:** See **Section 8** of the [Technical Documentation](TECHNICAL_DOCS.md) for the complete schema design and integration strategy.

---

## Setup & Installation Guide

### Prerequisites
*   **Node.js** (v18 or higher recommended)
*   **npm** or **yarn**

### Step-by-Step Instructions

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/your-org/orbit-watch.git
    cd orbit-watch
    ```

2.  **Install Dependencies**
    This installs React, Three.js, TensorFlow.js, and Satellite.js.
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
    *   **Option A (Real Data):** Enter valid Space-Track.org credentials. (Note: This may require disabling CORS in your browser for development).
    *   **Option B (Demo/Fallback):** Enter any dummy credentials (e.g., `admin`/`password`). The system will detect the network block and automatically load the cached real-world dataset so you can explore the features immediately.

---

## Conclusion

OrbitWatch demonstrates a high level of proficiency in modern frontend engineering and applied artificial intelligence. By moving the entire computation stack—including the Machine Learning training loop and orbital physics engine—to the client, we have achieved:

1.  **Scalability:** The backend is effectively serverless; the user's machine handles the compute.
2.  **Latency:** Anomaly detection happens in milliseconds without network round-trips.
3.  **Privacy:** Sensitive orbital analysis logic runs locally.
4.  **Visual Fidelity:** Utilizing WebGL for cinema-grade visualization of complex datasets.

This project serves as a proof-of-concept for next-generation Space Domain Awareness tools that leverage the full power of the modern web platform.
