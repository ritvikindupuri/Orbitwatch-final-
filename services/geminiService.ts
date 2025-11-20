import { RealSatellite, AnomalyDetails } from "../types";

// This service communicates with the local Python backend for anomaly analysis.
// It does not connect to the Google Gemini API.
const BACKEND_URL = 'http://127.0.0.1:5000';

export async function generateAnomalyAnalysis(satellite: RealSatellite): Promise<Omit<AnomalyDetails, 'operatorNotes'>> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(satellite),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Backend server responded with status: ${response.status}`);
        }

        const analysisResult = await response.json();
        return analysisResult;

    } catch (error) {
        console.error("Error calling backend for AI analysis:", error);
        throw new Error("Failed to get AI analysis from the backend server.");
    }
}
