
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
The model is a **Sequential Neural Network** with the following topology:

1.  **Input Layer:** 6 Neurons (The Normalized Features)
2.  **Encoder Layer 1:** 12 Neurons (`tanh` activation) - Expands dimensions to capture non-linear relationships.
3.  **Encoder Layer 2:** 6 Neurons (`relu` activation) - Compresses data.
4.  **Latent Space (Bottleneck):** 3 Neurons (`relu` activation) - This is the compressed "essence" of the orbit.
5.  **Decoder Layer 1:** 6 Neurons (`relu` activation) - Expands back out.
6.  **Decoder Layer 2:** 12 Neurons (`tanh` activation) - Reconstructs features.
7.  **Output Layer:** 6 Neurons (`linear` activation) - The reconstructed orbit.

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
Overfitting occurs when a model memorizes the training data (noise) rather than learning the underlying physical rules. We utilize three specific strategies to prevent this, ensuring the model remains robust:

1.  **The Information Bottleneck (Architecture):**
    Our input vector has **6 dimensions**, but the Latent Space (middle layer) has only **3 dimensions**. This 50% compression ratio is the primary regularization technique. It makes it mathematically impossible for the model to simply learn the "Identity Function" (where Output = Input). The model *must* discard noise and retain only the correlated physics (e.g., the relationship between Mean Motion and Altitude) to traverse the bottleneck successfully.

2.  **Strict Epoch Limiting:**
    We train for exactly **30 Epochs**. In experimentation, convergence typically happens around epoch 20. Training for 1000+ epochs would allow the weights to adjust to the specific floating-point quirks of the Space-Track TLE snapshot, leading to overfitting. By "early stopping" at 30, we capture the general manifold of Keplerian mechanics without memorizing specific satellite IDs.

3.  **Regime Mixing:**
    Our data ingestion strategy explicitly forces the retrieval of both **LEO** (Mean Motion > 11.25) and **GEO** (Mean Motion ~1.0) datasets. If we trained only on LEO, the model would "overfit" to fast-moving objects and flag every GEO satellite as an anomaly due to its low speed. By feeding a diverse dataset, the model learns a generalized representation of Earth orbit physics, not just one altitude regime.

### 3.7 Why this Architecture is Superior (Design Justification)

**1. Versus Ensemble Models (e.g., Random Forest + SVM + Neural Net):**
While "Voting Ensembles" are popular in Kaggle competitions, they are computationally expensive.
*   **Constraint:** OrbitWatch runs in the browser. Running 3 separate inference engines would triple the memory usage and GPU calls, likely dropping the 3D Globe frame rate below 60fps.
*   **Physics:** Kepler's Laws ($T^2 \propto a^3$) are universal. We do not need different models for different satellites. A single Deep Autoencoder is sufficient to capture the universal physics of orbital mechanics.

**2. Versus Supervised Classification:**
A generic Classifier (e.g., "Is this broken? Yes/No") requires **Labeled Data**.
*   **Problem:** Real-world satellite hacks and kinetic breakups are extremely rare and highly classified. We do not have a dataset of 10,000 "Hacked Satellites" to train a classifier on.
*   **Solution:** The Autoencoder is **Unsupervised**. It detects *deviations from the norm*. This makes it superior for this domain because it can detect *novel* (Zero-Day) threats that have never been seen before, simply because they defy the laws of physics the model learned from the nominal population.

**3. Versus Isolation Forests:**
Isolation Forests are standard for outlier detection but struggle with high-dimensional non-linear relationships. Orbital elements are non-linearly correlated (e.g., the relationship between Eccentricity and Mean Anomaly). The non-linear activation functions (`ReLU`, `Tanh`) in our Deep Neural Network allow it to model these complex orbital curves significantly better than linear statistical methods.

---

## 4. Data Ingestion Strategy (`services/satelliteData.ts`)

### 4.1 Space-Track API Integration
The app attempts to connect to `https://www.space-track.org/ajaxauth/login`.
*   **Method:** POST
*   **Payload:** `identity` (username), `password`.
*   **Query:** We execute two parallel queries to `basicspacedata/query`:
    1.  **LEO Query:** `MEAN_MOTION > 11.25` (Objects completing >11 orbits per day).
    2.  **GEO Query:** `MEAN_MOTION 0.99--1.01` (Objects completing ~1 orbit per day).
    *   *Why?* We need both regimes to ensure the ML model doesn't learn that "Fast = Normal" and flag all GEO satellites as anomalies.

### 4.2 The CORS Fallback Mechanism
**Problem:** Space-Track.org does not set `Access-Control-Allow-Origin` headers for localhost requests. Browsers will block the API call due to Cross-Origin Resource Sharing (CORS) policies.
**Solution:** The service catches the `Failed to fetch` error. If detected, it automatically loads `FALLBACK_TLE_SNAPSHOT`—a hardcoded constant containing real TLE strings for ~20 major satellites (Starlink, GPS, NOAA, etc.). This ensures the app is always demonstrable, even without a proxy server.

### 4.3 TLE Parsing
We use a custom parser to convert the 3-line string format into a JSON object (`RealSatellite`).
*   **Regex Logic:** Used to extract the NORAD ID, International Designator (Launch Year), and raw TLE lines.
*   **Country Detection:** We parse the `OBJECT_NAME` against a heuristic list (e.g., `BEIDOU` -> China, `GALILEO` -> EU) to assign the `OWNER` field.

---

## 5. Orbital Physics Engine (`components/AnomalyDetailView.tsx` & `MapDisplay.tsx`)

We utilize **SGP4 (Simplified General Perturbations 4)**, the NASA/NORAD standard for propagating satellite orbits.

### 5.1 Coordinate Systems
*   **TLE Data:** Provides Keplerian elements at a specific "Epoch" (time snapshot).
*   **ECI (Earth-Centered Inertial):** The propagator outputs X, Y, Z coordinates in km relative to the center of the earth, fixed to the stars (does not rotate with Earth).
*   **Geodetic (Lat/Lng/Alt):** We must account for Earth's rotation (GMST - Greenwich Mean Sidereal Time) to convert ECI to Latitude, Longitude, and Altitude.

### 5.2 Historical Reconstruction
In `AnomalyDetailView.tsx`, we generate the "Orbital History" charts. Since we don't store past data in a database, we **mathematically reconstruct** it.
*   We take the current TLE.
*   We run the SGP4 propagator in a loop, decrementing time by 15 minutes for 96 steps (24 hours).
*   This generates the precise Altitude and Velocity curves seen in the UI.

---

## 6. Frontend Component Breakdown

### 6.1 `App.tsx`
The root orchestrator.
*   **State:** `satelliteCatalog` (Data), `alerts` (Active Anomalies), `isAuthenticated` (View Switching).
*   **Analysis Loop:** A `useEffect` hook runs every 7 seconds. It selects a random satellite from the catalog and passes it to `generateAnomalyAnalysis()`. The result updates the `alerts` state.

### 6.2 `MapDisplay.tsx`
*   **Library:** `react-globe.gl`.
*   **Performance:** Uses Instanced Mesh Rendering to draw 3000+ points at 60FPS.
*   **The Animation Loop:** A `setInterval` runs every 1000ms. It:
    1.  Gets the current time `new Date()`.
    2.  Propagates *every* satellite in the catalog to find its new Lat/Lng.
    3.  Updates the `pointsData` prop of the Globe.
*   **Visuals:**
    *   *Points:* Colored by Risk Level (Red=Critical, Cyan=Selected).
    *   *Rings:* `ringsData` creates the pulsating effect at the Lat/Lng of anomalies.

### 6.3 `DashboardPanel.tsx`
Displays the list of active alerts.
*   **Filtering:** Implements client-side filtering for Country, Object Type, and Search Text.
*   **Charts:** Uses `recharts` to render the Risk Distribution bar chart based on the aggregation of the `alerts` state.

### 6.4 `AnomalyDetailView.tsx`
The deep-dive view.
*   **Live Vectors:** Runs its own 1-second interval SGP4 loop to show the "odometer" style changing numbers for Altitude/Velocity.
*   **Tooltips:** Renders the explanation for the ML Score.

---

## 7. Risk & Threat Classification

The system maps the numerical ML score to industry-standard frameworks.

| Risk Score | Level | Interpretation |
| :--- | :--- | :--- |
| 0 - 20 | Informational | Nominal station-keeping. |
| 21 - 45 | Low | Minor variance, likely sensor noise or drag. |
| 46 - 70 | Moderate | Statistically significant deviation. |
| 71 - 90 | High | Strong anomaly. Unannounced maneuver. |
| 91 - 100 | Critical | Physics breakdown. Possible breakup or kinetic event. |

**MITRE ATT&CK mapping:**
We map the anomaly type to cyber-threat IDs (e.g., `T1584`) to simulate how a cyber-attack on a satellite's guidance system would manifest physically as an orbital anomaly.
