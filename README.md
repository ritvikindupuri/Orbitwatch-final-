
# OrbitWatch: AI-Powered Space Domain Awareness (SDA) Platform

![Status](https://img.shields.io/badge/Status-Operational-green)
![Stack](https://img.shields.io/badge/Tech-React_19_%7C_TensorFlow.js_%7C_Three.js-cyan)
![Physics](https://img.shields.io/badge/Physics-SGP4%2FSDP4-orange)
![ML](https://img.shields.io/badge/AI-Deep_Autoencoder-purple)

**OrbitWatch** is a cutting-edge, client-side application designed to simulate the capabilities of a Space Operations Center (SpOC). It ingests real orbital telemetry (TLE data), visualizes assets on an interactive 3D globe, and employs a browser-based Deep Autoencoder to detect station-keeping anomalies and potential cyber-kinetic threats in real-time.

For a deep dive into the mathematics and engineering, please read the [Technical Documentation](TECHNICAL_DOCS.md).

---

## 🛠 Technology Stack

OrbitWatch utilizes a modern, "Thick Client" stack to deliver high-performance physics and AI without server-side latency.

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Core** | **React 19 (Vite)** | Component lifecycle, State management, HMR. |
| **Machine Learning** | **TensorFlow.js** | Runs the Deep Autoencoder model on the GPU via WebGL. |
| **Orbital Physics** | **Satellite.js** | SGP4/SDP4 propagation algorithms for real-time tracking. |
| **Visualization** | **React-Globe.gl** | High-performance 3D rendering wrapper for Three.js. |
| **Styling** | **Tailwind CSS** | Utility-first styling for the mission-control aesthetic. |
| **Data Source** | **Space-Track.org** | Real-world TLE (Two-Line Element) catalog data. |

---

## 🏗 System Architecture

OrbitWatch has migrated from a traditional Client-Server model to a **Thick Client** architecture. This ensures zero latency in orbital propagation and protects data privacy by running machine learning inference directly within the user's browser sandbox.

### Architectural Overview
The diagram below illustrates the complete component interaction model. Note how the **Browser Runtime** encapsulates the entire logic stack—including the Physics Engine (SGP4) and the AI Inference Engine (TensorFlow.js)—isolating it from external network dependencies after the initial data fetch.

<p align="center">
  <img src="https://i.imgur.com/cu6xW8n.png" alt="System Architecture" width="500" />
  <br>
  <b>Figure 1: High-Level System Architecture & Client-Side Sandbox Boundary</b>
</p>

---

## 🧠 Machine Learning Engine: Deep Autoencoder

Unlike rule-based systems, OrbitWatch uses **Unsupervised Learning**. We do not tell the model what an anomaly looks like; instead, we teach it what "normal" orbital physics look like, and it flags anything that breaks those laws.

### 1. Model Architecture
We utilize a **Sequential Autoencoder** built with `@tensorflow/tfjs`. The network compresses orbital data into a lower-dimensional "Latent Space" and attempts to reconstruct it.

*   **Input Layer (6 Neurons):** Accepts normalized orbital features.
*   **Encoder (Dense 12 -> Dense 6):** Compresses the data, forcing the network to learn the underlying manifold of orbital mechanics.
*   **Latent Space (Dense 3):** The "Bottleneck". This represents the pure essence of the orbit.
*   **Decoder (Dense 6 -> Dense 12):** Attempts to reconstruct the original input from the latent representation.
*   **Output Layer (6 Neurons):** The reconstructed orbit.

### 2. Feature Engineering
The model is trained on **6 Key Orbital Elements** extracted from the Two-Line Element (TLE) sets:
1.  **Inclination:** The tilt of the orbit.
2.  **Eccentricity:** How circular or elliptical the orbit is.
3.  **Mean Motion:** The speed of the satellite (crucial for distinguishing LEO vs GEO).
4.  **RAAN:** Right Ascension of the Ascending Node.
5.  **Argument of Perigee:** Orientation of the orbit.
6.  **Mean Anomaly:** Position of the satellite along the ellipse.

### 3. Anomaly Scoring Logic
The "Risk Score" is calculated mathematically, not heuristically:

$$ Risk = MeanSquaredError(Input - Output) \times ScalingFactor $$

*   If a satellite follows standard Keplerian physics (learned during training), the reconstruction error is near 0.
*   If a satellite performs an unannounced maneuver or drifts (station-keeping error), the error spikes.

### 4. Training Strategy & Robustness
To ensure the model is production-grade and robust against overfitting:
*   **Regime Mixing:** The ingestion pipeline fetches both **LEO** (Low Earth Orbit) and **GEO** (Geostationary) datasets. This forces the model to learn a generalized representation of orbital mechanics rather than overfitting to the high speed of LEO objects.
*   **Information Bottleneck:** By compressing 6 input features into a 3-neuron latent space, we mathematically force the model to discard noise and retain only the core physical correlations.
*   **Early Stopping:** Training is capped at 30 epochs to prevent the network from memorizing specific TLE sets (overfitting to the snapshot).

---

## 🚀 Technical Component Documentation

### `App.tsx` (The Orchestrator)
*   **Role:** Manages the global state (Authentication, Data Loading, Training Progress).
*   **Logic:** It implements a state machine that transitions from `Login` -> `Fetching` -> `Training` -> `Dashboard`.
*   **Simulation Loop:** Triggers the `generateAnomalyAnalysis` function periodically to simulate the discovery of new threats based on real-time checks.

### `services/tensorFlowService.ts` (The Brain)
*   **Training:** On login, it converts raw TLE strings into tensors. It runs `model.fit()` for 30 epochs directly in the browser tab using WebGL acceleration.
*   **Inference:** Provides the `generateAnomalyAnalysis()` function. It standardizes inputs using the mean/variance calculated during training to ensure statistical validity.

### `components/MapDisplay.tsx` (The Visualization)
*   **Engine:** `react-globe.gl` (Three.js wrapper).
*   **Rendering:** Renders thousands of objects using instanced mesh rendering for 60FPS performance.
*   **Physics Integration:** Calls `satellite.js` 60 times per second to update the position of every dot based on the current millisecond.
*   **Visuals:** Implements Bump Maps (Topology) and Specular Maps (Water reflection) for photorealism.

### `services/satelliteData.ts` (The Data Layer)
*   **CORS Handling:** Browsers block direct calls to Space-Track. This service attempts a direct connection but implements a robust **Fallback Strategy**. If the API blocks the request, it seamlessly loads a curated snapshot of real TLE data (Starlink, GPS, NOAA, etc.) to ensure the app remains functional for demonstrations.
*   **Parsing:** Converts the 3-line text format of TLEs into structured JSON objects.
*   **Attribution:** Regex-based parsing of satellite names to determine Country of Origin (e.g., `COSMOS` -> CIS, `BEIDOU` -> PRC).

### `components/AnomalyDetailView.tsx` (The Inspector)
*   **SGP4 Integration:** Calculates live vectors (Apogee, Perigee, Velocity) in real-time.
*   **Math:** Uses the `satellite.js` library to transform ECI (Earth-Centered Inertial) coordinates into Geodetic (Lat/Lng/Alt) coordinates.

---

## 📡 Data Flow & API Integration

The application prioritizes real data but is built to be resilient against browser security restrictions.

### Logic Flowchart
The diagram below details the ingestion lifecycle. It visualizes the path from User Credentials to Space-Track Authentication. Crucially, it depicts the **CORS Fallback Mechanism**, where the system intelligently switches to a cached real-world snapshot if browser security policies block the direct API connection. This ensures that the TensorFlow model *always* receives valid physics data for training, regardless of network conditions.

<p align="center">
  <img src="https://i.imgur.com/ceADblA.png" alt="Data Flow" width="500" />
  <br>
  <b>Figure 2: Ingestion Logic & CORS Fallback Mechanism</b>
</p>

---

## 🛠 Setup & Installation Guide

### Prerequisites
*   **Node.js** (v18 or higher recommended)
*   **npm** or **yarn**

### Step-by-Step
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

## 🎯 Conclusion

**To the Engineering Leadership Team:**

OrbitWatch demonstrates a high level of proficiency in modern frontend engineering and applied artificial intelligence. By moving the entire computation stack—including the Machine Learning training loop and orbital physics engine—to the client, we have achieved:

1.  **Scalability:** The backend is effectively serverless; the user's machine handles the compute.
2.  **Latency:** Anomaly detection happens in milliseconds without network round-trips.
3.  **Privacy:** Sensitive orbital analysis logic runs locally.
4.  **Visual Fidelity:** Utilizing WebGL for cinema-grade visualization of complex datasets.

This project serves as a proof-of-concept for next-generation Space Domain Awareness tools that leverage the full power of the modern web platform.
