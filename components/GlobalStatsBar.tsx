import React, { useMemo } from 'react';
import { AnomalyAlert } from '../types';
import { RiskLevel } from '../constants';

interface GlobalStatsBarProps {
    alerts: AnomalyAlert[];
    satelliteCount: number;
}

const StatCard: React.FC<{ title: string; value: string | number; valueColor?: string; }> = ({ title, value, valueColor = 'text-gray-100' }) => (
    <div className="flex-1 p-3 bg-gray-900/50 rounded-md border border-gray-700/60 text-center">
        <p className="text-xs text-cyan-300 uppercase tracking-wider">{title}</p>
        <p className={`text-2xl font-bold font-mono ${valueColor}`}>{value}</p>
    </div>
);

const getRiskColorClass = (risk: RiskLevel) => {
    switch (risk) {
        case 'Critical': return 'text-rose-500';
        case 'High': return 'text-orange-500';
        case 'Moderate': return 'text-amber-400';
        case 'Low': return 'text-sky-400';
        default: return 'text-gray-400';
    }
}

export const GlobalStatsBar: React.FC<GlobalStatsBarProps> = ({ alerts, satelliteCount }) => {

    const { highestRisk, activeAlerts } = useMemo(() => {
        const riskOrder: RiskLevel[] = ['Informational', 'Low', 'Moderate', 'High', 'Critical'];
        
        let highestRisk: RiskLevel = 'Informational';
        
        const completedAlerts = alerts.filter(a => a.analysisState === 'complete' && a.details);

        if (completedAlerts.length > 0) {
            highestRisk = completedAlerts.reduce((maxRisk, alert) => {
                const currentIndex = riskOrder.indexOf(alert.details!.riskLevel);
                const maxIndex = riskOrder.indexOf(maxRisk);
                return currentIndex > maxIndex ? alert.details!.riskLevel : maxRisk;
            }, 'Informational');
        }

        return {
            highestRisk: completedAlerts.length > 0 ? highestRisk : 'N/A',
            activeAlerts: alerts.length
        }
    }, [alerts]);


    return (
        <div className="p-3 bg-gray-950/70 backdrop-blur-sm border-b border-gray-700/50 z-10">
            <div className="flex items-center space-x-4">
                <StatCard title="Tracked Assets" value={satelliteCount} />
                <StatCard title="Active Alerts" value={activeAlerts} />
                <StatCard 
                    title="Highest Risk" 
                    value={highestRisk}
                    valueColor={getRiskColorClass(highestRisk as RiskLevel)}
                />
                <StatCard title="System Status" value="Nominal" valueColor="text-green-400" />
            </div>
        </div>
    );
};
