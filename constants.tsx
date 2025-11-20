import React from 'react';

export const APP_NAME = "OrbitWatch";

export type RiskLevel = 'Informational' | 'Low' | 'Moderate' | 'High' | 'Critical';

export const getRiskColor = (riskLevel: RiskLevel | undefined): string => {
    switch (riskLevel) {
        case 'Critical': return 'border-rose-500';
        case 'High': return 'border-orange-500';
        case 'Moderate': return 'border-amber-400';
        case 'Low': return 'border-sky-400';
        case 'Informational': return 'border-gray-500';
        default: return 'border-cyan-500';
    }
};

export const getRiskHoverColor = (riskLevel: RiskLevel | undefined): string => {
     switch (riskLevel) {
        case 'Critical': return 'hover:bg-rose-900/60';
        case 'High': return 'hover:bg-orange-900/60';
        case 'Moderate': return 'hover:bg-amber-900/60';
        case 'Low': return 'hover:bg-sky-900/60';
        case 'Informational': return 'hover:bg-gray-700/60';
        default: return 'hover:bg-gray-700/60';
    }
};

export const getRiskHexColor = (riskLevel: RiskLevel | undefined): string => {
    switch (riskLevel) {
        case 'Critical': return '#f43f5e'; // rose-500
        case 'High': return '#f97316'; // orange-500
        case 'Moderate': return '#facc15'; // amber-400
        case 'Low': return '#38bdf8'; // sky-400
        case 'Informational': return '#6b7280'; // gray-500
        default: return '#22d3ee'; // cyan-400
    }
};