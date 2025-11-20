
# OrbitWatch: Technical Reference Manual

## 1. Executive Summary

OrbitWatch represents a paradigm shift in Space Domain Awareness (SDA) architecture. Traditionally, orbital analysis and anomaly detection are computationally expensive tasks relegated to heavy backend clusters or cloud environments. This centralized approach introduces latency, bandwidth constraints, and potential single points of failure.

**OrbitWatch proves that modern browser engines, equipped with WebGL and WebAssembly (Wasm), are capable of handling the rigorous mathematics of SGP4 propagation and Deep Learning inference entirely on the client side.**

By shifting the compute load to the edge (the operator's machine), the platform achieves:
1.  **Zero-Latency Inference:** Anomaly detection occurs instantly within the local memory space, removing network round-trips.
2.  **Operational Security:** Sensitive orbital analysis logic runs locally within the browser sandbox; no raw telemetry needs to leave the secure terminal.
3.  **Infrastructure Reduction:** The backend is effectively serverless, drastically reducing the cost and complexity of deployment.

This document serves as a comprehensive engineering manual, detailing the specific implementation of the Client-Side Sandbox, the mathematical derivation of the Deep Autoencoder, and the React-based orchestration layer that binds the physics and AI engines together.

---

## 2. System Architecture

### High-Level Data Flow
The application follows a linear state initialization followed by a cyclic analysis loop.

1.  **Ingestion Phase:** User Login -> API Auth -> TLE Data Fetch -> Parsing.
2.  **Training Phase:** Raw TLEs -> Vectorization -> Normalization -> Model Training (30 Epochs).
3.  **Operational Phase:** 3D Globe Rendering <-> Real-time SGP4 Propagation <-> ML Inference Loop.

### Tech Stack
*   **Core Framework:** React 19 (Vite Build System)
*   **Machine Learning:** TensorFlow.js (WebGL Backend)
*   **Orbital Physics:** `satellite.js` (SGP4/SDP4 implementation)
*   **Visualization:** `react-globe.gl` (Three.js wrapper)
*   **Styling:** Tailwind CSS

---

## 3. Machine Learning Pipeline (`services/tensorFlowService.ts`)

The core of the anomaly detection system is a **Deep Autoencoder**. An Autoencoder is a type of Neural Network trained to copy its input to its output. By restricting the network's capacity (creating a "bottleneck"), we force it to learn the most significant patterns in the data.

### 3.1 Feature Engineering
We extract **6 Orbital Elements** from the Two-Line Element (TLE) sets to serve as the input vector for the model.

| Feature Index | Name | Unit | Purpose |
| :--- | :--- | :--- | :--- |
| 0 | **Inclination** | Radians | Defines orbital tilt relative to the equator. |
| 1 | **Eccentricity** | Unitless | Defines deviation from a perfect circle. |
| 2 | **Mean Motion** | Rad/Min | Defines orbital speed. **Critical** for distinguishing LEO vs GEO. |
| 3 | **RAAN** | Radians | Right Ascension of the Ascending Node. |
| 4 | **Arg of Perigee** | Radians | Orientation of the orbit within the orbital plane. |
| 5 | **Mean Anomaly** | Radians | Satellite's position along the ellipse at epoch. |

### 3.2 Data Normalization (Z-Score Standardization)
Neural networks cannot handle raw orbital data effectively because the scales differ wildly (e.g., Eccentricity is 0.0001, while Mean Motion might be 15.0).
Before training, we calculate the **Mean ($\mu$)** and **Standard Deviation ($\sigma$)** of the entire catalog. Every input vector $x$ is transformed:

$$ x' = \frac{x - \mu}{\sigma} $$

This ensures all inputs are centered around 0 with a variance of 1, allowing the Gradient Descent optimizer to converge significantly faster.

### 3.3 Model Architecture

<p align="center">
  <img src="https://i.imgur.com/JjEf0lv.png" alt="Deep Autoencoder Architecture" width="400" />
  <br>
  <b>Figure 3: Deep Autoencoder Topology & Node Breakdown</b>
</p>

The model utilizes a symmetrical "hourglass" topology designed to compress orbital mechanics into a simplified manifold.

**Node Breakdown:**

1.  **Input Layer (6 Nodes):**
    *   Receives the normalized Z-Scores of the 6 orbital elements (Inc, Ecc, MM, RAAN, ArgP, MA).
    *   Acts as the interface between the SGP4 physics engine and the Neural Network.

2.  **Encoder Layer (12 Nodes - Activation: Tanh):**
    *   **Function:** High-dimensional mapping.
    *   **Math:** Uses the Hyperbolic Tangent (`tanh`) activation function to map inputs to a range of [-1, 1]. This layer looks for non-linear correlations between elements (e.g., how Inclination correlates with RAAN precession).

3.  **Compression Layer (6 Nodes - Activation: ReLU):**
    *   **Function:** Feature Reduction.
    *   **Math:** Uses Rectified Linear Unit (`ReLU`) to zero out weak correlations and focus on strong signal pathways, beginning the compression process.

4.  **Latent Space / Bottleneck (3 Nodes - Activation: ReLU):**
    *   **Function:** The "Concept" Layer.
    *   **Details:** This is the most critical layer. By forcing the 6 input features into 3 neurons, the model effectively learns a "Lossy Compression" of orbital physics. It cannot simply memorize the input; it must learn the *rules* of how orbits work to fit the data through this gate.

5.  **Decompression Layer (6 Nodes - Activation: ReLU):**
    *   **Function:** Reconstruction initialization.
    *   **Math:** Expands the latent concepts back into feature space.

6.  **Decoder Layer (12 Nodes - Activation: Tanh):**
    *   **Function:** Fine-tuning.
    *   **Math:** Mirrors the Encoder layer to smooth out the reconstruction before the final output.

7.  **Output Layer (6 Nodes - Linear):**
    *   **Function:** Final Reconstruction.
    *   **Result:** Produces the "Predicted" orbit. Ideally, `Output ≈ Input`.

### 3.4 Training Process
*   **Optimizer:** Adam (Adaptive Moment Estimation) with learning rate 0.01.
*   **Loss Function:** Mean Squared Error (MSE).
*   **Epochs:** 30.
*   **Execution:** Runs on the GPU via WebGL to prevent freezing the UI thread.

### 3.5 Anomaly Scoring Logic
The Risk Score is **not simulated**. It is a direct result of a mathematical operation performed by the TensorFlow engine in real-time. The calculation flow is as follows:

1.  **Input:** We take the real physics data (Input Tensor $X$) derived from the SGP4 propagation.
2.  **Processing:** The Neural Network passes these numbers through its layers, compressing them into 3 numbers (Latent Space) and then attempting to expand them back to 6.
3.  **Calculation:** We execute `tf.losses.meanSquaredError(input, output)`.
    *   This subtracts the **Output** (what the model thinks the orbit *should* look like based on its training) from the **Input** (what the orbit *actually* looks like).
4.  **The Score (Reconstruction Error):**
    *   If the satellite follows standard orbital mechanics, the error is tiny (e.g., 0.002).
    *   If the satellite is anomalous (deviating from the learned physics manifold), the error is high (e.g., 0.5).
5.  **Display:** We scale that raw error number to fit a 0-100 UI scale:
    $$ Score = \min(100, MSE \times 500) $$

### 3.6 Prevention of Overfitting
Overfitting occurs when a model memorizes the training data (noise) rather than learning the underlying physical rules. We utilize three specific strategies to prevent this:

1.  **The Information Bottleneck:**
    As visualized in Figure 3, the 3-neuron bottleneck (50% compression) mathematically forces the model to discard noise. It acts as a structural regularizer.

2.  **Strict Epoch Limiting:**
    We train for exactly **30 Epochs**. In experimentation, convergence typically happens around epoch 20. Training for 1000+ epochs would allow the weights to adjust to the specific floating-point quirks of the Space-Track TLE snapshot.

3.  **Regime Mixing (LEO + GEO):**
    The ingestion pipeline fetches both **LEO** (Mean Motion > 11.25) and **GEO** (Mean Motion ~1.0) datasets. This prevents the model from overfitting to "Fast" objects and ensures the Autoencoder generalizes across all altitudes.

---

## 4. Data Ingestion Strategy (`services/satelliteData.ts`)

### 4.1 Space-Track API Integration
The app attempts to connect to `https://www.space-track.org/ajaxauth/login`.
*   **Method:** POST
*   **Payload:** `identity` (username), `password`.
*   **Query:** We execute two parallel queries to `basicspacedata/query` to fetch LEO and GEO subsets simultaneously.

### 4.2 The CORS Fallback Mechanism
**Problem:** Space-Track.org does not set `Access-Control-Allow-Origin` headers for localhost requests.
**Solution:** The service catches the `Failed to fetch` error. If detected, it automatically loads `FALLBACK_TLE_SNAPSHOT`—a hardcoded constant containing real TLE strings for ~20 major satellites (Starlink, GPS, NOAA, etc.). This ensures the app is always demonstrable, even without a proxy server.

---

## 5. Orbital Physics Engine

We utilize **SGP4 (Simplified General Perturbations 4)**, the NASA/NORAD standard for propagating satellite orbits. This mathematical model accounts for the Earth's oblateness (J2 perturbation), atmospheric drag, and lunar/solar gravity effects to predict a satellite's position/velocity from a TLE.

### 5.1 Real-Time Historical Reconstruction (The "Moving Window" Strategy)
One of the unique challenges of a client-side application is the lack of a persistent database storing weeks of historical telemetry. To visualize trends (like the Altitude and Velocity charts in `AnomalyDetailView.tsx`), we employ a technique called **Reverse-Time Propagation**.

#### Construction Logic
Instead of querying a database for past rows, we query the **Physics Engine**. When the view loads:
1.  **Anchor Point:** We establish `t0 = Current System Time`.
2.  **Iteration:** We execute a backward-looking loop that iterates **96 times** (representing the past 24 hours in 15-minute intervals).
3.  **Propagation:** For each step $i$:
    *   Calculate target time $t = t0 - (i \times 15 \text{ minutes})$.
    *   Invoke `satellite.propagate(satrec, t)` to get the ECI (Earth-Centered Inertial) position vector ($x, y, z$) and velocity vector ($\dot{x}, \dot{y}, \dot{z}$).
4.  **Transformation:** Convert ECI coordinates to **Geodetic** coordinates (Latitude, Longitude, Altitude) using Greenwich Mean Sidereal Time (GMST).
5.  **Scalar Derivation:** Calculate scalar Velocity magnitude ($v = \sqrt{\dot{x}^2 + \dot{y}^2 + \dot{z}^2}$).

#### Real-Time Update Mechanism
To make the charts "Live" rather than static snapshots:
*   **Trigger:** A React `useEffect` hook sets an interval timer (e.g., every 5 seconds).
*   **State Mutation:** This timer updates a `now` state variable.
*   **Re-Calculation:** This state change triggers a `useMemo` dependency invalidation. The entire 96-step physics loop runs again instantly (taking < 2ms on modern CPUs).
*   **Visual Result:** The graph data array shifts forward. The oldest data point drops off, and a new "current" data point is added at the front. To the user, the graph appears to "crawl" forward in real-time, simulating a live data stream filling a buffer.

---

## 6. Frontend Component Breakdown

### 6.1 `App.tsx`
The root orchestrator.
*   **State:** `satelliteCatalog` (Data), `alerts` (Active Anomalies), `isAuthenticated` (View Switching).
*   **Analysis Loop:** A `useEffect` hook runs every 7 seconds. It selects a random satellite from the catalog and passes it to `generateAnomalyAnalysis()`.

### 6.2 `MapDisplay.tsx` (3D Visualization)
*   **Engine:** `react-globe.gl`.
*   **Ripple Visualization:** Instead of "beams", anomalies are rendered as **pulsating 2D rings** (`ringsData`) on the surface of the globe. The color of the ring corresponds to the Risk Level (Red/Orange/Yellow).
*   **User Interaction:** The `onRingClick` handler allows users to click directly on a pulsating ripple to select the anomaly, passing the ID up to the parent orchestrator.

### 6.3 `DashboardPanel.tsx` (Control Interface)
*   **Debounced Filtering:** The search input utilizes a **300ms debounce**. This ensures that the filtering logic (which matches against Name, NORAD ID, Risk Level, Country, and Type) only runs once the user stops typing, preventing UI lag during rapid input.
*   **Risk Distribution:** Uses `recharts` to render a dynamic bar chart summarizing the threat landscape.

### 6.4 `AnomalyDetailView.tsx` (Deep Analysis)
The deep-dive view containing:
*   **Threat Classification Card:** Displays the **ML Risk Score** with an interactive tooltip explaining the MSE calculation. It also lists the specific **MITRE ATT&CK®** technique ID and **SPARTA** classification mapping.
*   **Live Vectors:** Runs its own 1-second interval SGP4 loop to show the "odometer" style changing numbers for Altitude/Velocity.
*   **Charts:** Area charts for Altitude and Velocity history, sized to fit without scrolling cutoff.

---

## 7. Operational Lifecycle Walkthrough

This section traces the exact flow of data from user input to visual alert.

1.  **Initialization:**
    *   User enters credentials in `SpaceTrackLogin`.
    *   `satelliteData.ts` fetches ~20-500 TLE records (LEO/GEO mix).
    *   **Result:** A `RealSatellite[]` array is stored in React State.

2.  **Training (The "Loading" Screen):**
    *   `App.tsx` triggers `trainModelOnCatalog`.
    *   `tensorFlowService.ts` extracts 6 features from every satellite.
    *   Stats (Mean/StdDev) are calculated.
    *   The Autoencoder trains for 30 epochs on this specific data.
    *   **Result:** A trained `tf.Sequential` model exists in browser memory.

3.  **Steady State:**
    *   User sees the 3D Globe (`MapDisplay`).
    *   Every 60ms, `MapDisplay` calculates new X/Y/Z positions for all dots.

4.  **Anomaly Detection Event:**
    *   Every 7 seconds, the `App.tsx` loop picks a random satellite.
    *   It calls `model.predict(satellite)`.
    *   The model calculates a Reconstruction Error (MSE).
    *   **Result:** If MSE is high, a new `AnomalyAlert` is added to the state.

5.  **User Response:**
    *   The map renders a **Red Pulsating Ring** around the satellite.
    *   User clicks the ring.
    *   `AnomalyDetailView` opens, showing the ML Risk Score and Vectors.

---

## 8. Conclusion & Future Roadmap

OrbitWatch has successfully validated the efficacy of "Thick Client" architectures for mission-critical space operations. The implementation demonstrates that:
1.  **Unsupervised Learning** is effective for detecting novel anomalies without labeled failure datasets.
2.  **Client-Side Inference** via TensorFlow.js is performant enough for real-time analysis of thousands of objects.
3.  **Cinema-Grade Visualization** can coexist with rigorous engineering tools in a web context.

### Engineering Roadmap (Next Steps)
To evolve from a Technical Proof-of-Concept (PoC) to a production-ready SpOC tool, the following milestones are proposed:

*   **Phase 2: Rust & WebAssembly Migration**
    *   *Objective:* Port the SGP4 propagation loop from JavaScript to Rust (compiled to Wasm).
    *   *Benefit:* Increase particle simulation capacity from ~3,000 to 20,000+ objects at 60 FPS.

*   **Phase 3: Temporal ML Models (LSTM)**
    *   *Objective:* Replace the current dense Autoencoder with a Long Short-Term Memory (LSTM) Autoencoder.
    *   *Benefit:* Allow the system to analyze time-series sequences of TLEs, enabling detection of gradual degradation trends (e.g., slowly failing thrusters) rather than just instantaneous state anomalies.

*   **Phase 4: Federated Learning**
    *   *Objective:* Implement a distributed training protocol.
    *   *Benefit:* Allow individual operator nodes to train on local data and share weight updates without ever sharing the underlying classified orbital parameters or catalog data.
