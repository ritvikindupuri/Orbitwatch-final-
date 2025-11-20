
# OrbitWatch: Technical Reference Manual

## 1. Executive Summary
OrbitWatch is a **Client-Side Space Domain Awareness (SDA)** platform. Unlike traditional architectures where heavy computation happens on a backend server, OrbitWatch leverages **WebAssembly (Wasm)** and **WebGL** to perform orbital propagation and Machine Learning inference directly within the user's browser.

This document details the mathematical models, data pipelines, and React component architecture that power the application.

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
  <img src="https://i.imgur.com/JjEf0lv.png" alt="Deep Autoencoder Architecture" width="500" />
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
During the operational phase, we feed live satellite data into the trained model.
1.  **Input:** Real Orbit ($X$)
2.  **Output:** Reconstructed Orbit ($\hat{X}$)
3.  **MSE Calculation:** $Error = \frac{1}{n} \sum (X - \hat{X})^2$

**Interpretation:**
*   **Low Error:** The satellite conforms to the patterns learned from the general population (Nominal).
*   **High Error:** The satellite has orbital parameters that statistically deviate from the learned manifold (Anomaly).

**Risk Score Scaling:**
We apply a scalar multiplier to convert the raw MSE (typically 0.001 - 0.5) into a human-readable 0-100 score.
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

We utilize **SGP4 (Simplified General Perturbations 4)**, the NASA/NORAD standard for propagating satellite orbits.

### 5.1 Historical Reconstruction
In `AnomalyDetailView.tsx`, we generate the "Orbital History" charts. Since we don't store past data in a database, we **mathematically reconstruct** it.
*   We take the current TLE.
*   We run the SGP4 propagator in a loop, decrementing time by 15 minutes for 96 steps (24 hours).
*   This generates the precise Altitude and Velocity curves seen in the UI.

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

## 7. Conclusion & Future Roadmap

OrbitWatch demonstrates that advanced SDA capabilities can be delivered via the browser without compromising on physical accuracy or algorithmic depth. By moving the ML and Physics logic to the client, we enable scalable, secure, and high-performance monitoring suitable for modern space operations centers.
