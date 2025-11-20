

export interface RealSatellite {
    OBJECT_NAME: string;
    NORAD_CAT_ID: number;
    TLE_LINE1: string;
    TLE_LINE2: string;
    OWNER: string;
    OBJECT_TYPE: string;
    LAUNCH_DATE: string;
}

export interface AnomalyDetails {
    description: string;
    assessment: string;
    riskLevel: 'Informational' | 'Low' | 'Moderate' | 'High' | 'Critical';
    riskScore: number;
    mitreTechnique: string;
    spartaClassification: string;
    operatorNotes?: string;
}

export interface AnomalyAlert {
    satellite: RealSatellite;
    details?: AnomalyDetails;
    analysisState?: 'pending' | 'complete' | 'failed';
    timestamp: number;
}