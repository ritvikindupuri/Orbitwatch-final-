import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { AnomalyAlert } from '../types';
import { getRiskHexColor, RiskLevel } from '../constants';

interface RiskDistributionChartProps {
    alerts: AnomalyAlert[];
}

const riskOrder: RiskLevel[] = ['Critical', 'High', 'Moderate', 'Low', 'Informational'];

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ alerts }) => {
    const riskData = useMemo(() => {
        const counts: Record<RiskLevel, number> = {
            'Informational': 0, 'Low': 0, 'Moderate': 0, 'High': 0, 'Critical': 0
        };

        alerts.forEach(alert => {
            if (alert.details?.riskLevel) {
                counts[alert.details.riskLevel]++;
            }
        });
        
        return riskOrder
            .map(name => ({ name, count: counts[name] }))
            .filter(item => item.count > 0);

    }, [alerts]);

    const analyzedAlertsCount = useMemo(() => alerts.filter(a => a.analysisState === 'complete').length, [alerts]);

    if (analyzedAlertsCount === 0) {
        return (
             <div className="h-40 flex flex-col items-center justify-center text-center bg-gray-800/50 rounded-lg p-4">
                <h3 className="font-bold text-sm text-gray-200 mb-2">Active Alerts by Risk Level</h3>
                <p className="text-sm text-gray-500">Awaiting analyzed alerts to populate risk distribution.</p>
            </div>
        );
    }
    
    return (
        <div className="h-40 w-full bg-gray-800/50 rounded-lg p-2 flex flex-col">
            <h3 className="font-bold text-sm text-gray-200 px-2 mb-1">Active Alerts by Risk Level</h3>
            <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={riskData}
                        layout="vertical"
                        margin={{ top: 5, right: 35, left: 10, bottom: 0 }}
                    >
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false}
                            tick={{ fill: '#d4d4d8', fontSize: 12 }} // zinc-300
                            width={90}
                            interval={0}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(100, 116, 139, 0.2)' }}
                            contentStyle={{
                                background: 'rgba(30, 41, 59, 0.9)',
                                borderColor: '#4b5563',
                                borderRadius: '0.5rem',
                                fontSize: '12px',
                            }}
                            labelStyle={{ fontWeight: 'bold' }}
                            formatter={(value: number) => [`${value} alerts`, null]}
                        />
                        <Bar dataKey="count" minPointSize={2} radius={[0, 4, 4, 0]}>
                            {riskData.map((entry) => (
                                <Cell key={`cell-${entry.name}`} fill={getRiskHexColor(entry.name)} />
                            ))}
                             <LabelList dataKey="count" position="right" style={{ fill: '#e5e7eb', fontSize: 12, fontWeight: 'bold' }} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};