import React, { useMemo, useState } from 'react';
import { AnomalyAlert } from '../types';
import { getRiskColor, getRiskHexColor } from '../constants';

interface ThreatsViewProps {
    alerts: AnomalyAlert[];
    onSelectSatellite: (id: number) => void;
}

export const ThreatsView: React.FC<ThreatsViewProps> = ({ alerts, onSelectSatellite }) => {
    const [sortField, setSortField] = useState<'risk' | 'time' | 'name'>('risk');
    
    const sortedAlerts = useMemo(() => {
        return [...alerts].sort((a, b) => {
            if (sortField === 'risk') {
                return (b.details?.riskScore || 0) - (a.details?.riskScore || 0);
            } else if (sortField === 'time') {
                return b.timestamp - a.timestamp;
            } else {
                return a.satellite.OBJECT_NAME.localeCompare(b.satellite.OBJECT_NAME);
            }
        });
    }, [alerts, sortField]);

    return (
        <div className="flex-1 p-6 bg-gray-950 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-100 tracking-wide">Threat Detections</h2>
                        <p className="text-sm text-gray-400 font-mono mt-1">
                            Active Anomalies: <span className="text-cyan-400">{alerts.length}</span>
                        </p>
                    </div>
                    <div className="flex space-x-2">
                        <span className="text-xs font-bold text-gray-500 uppercase self-center mr-2">Sort By:</span>
                        <button 
                            onClick={() => setSortField('risk')}
                            className={`px-3 py-1 text-xs font-bold rounded border ${sortField === 'risk' ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                        >
                            RISK SCORE
                        </button>
                        <button 
                            onClick={() => setSortField('time')}
                            className={`px-3 py-1 text-xs font-bold rounded border ${sortField === 'time' ? 'bg-cyan-900/50 border-cyan-500 text-cyan-300' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                        >
                            TIMESTAMP
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-900/50 rounded-lg">
                        <div className="col-span-1 text-center">Risk</div>
                        <div className="col-span-3">Satellite Asset</div>
                        <div className="col-span-2">Owner</div>
                        <div className="col-span-3">Anomaly Detection</div>
                        <div className="col-span-2">Classification</div>
                        <div className="col-span-1 text-right">Action</div>
                    </div>

                    {sortedAlerts.map(alert => (
                        <div 
                            key={alert.satellite.NORAD_CAT_ID}
                            className="grid grid-cols-12 gap-4 items-center p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-600 transition-colors group"
                        >
                            <div className="col-span-1 flex flex-col items-center justify-center">
                                <div 
                                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-gray-900"
                                    style={{ backgroundColor: getRiskHexColor(alert.details?.riskLevel) }}
                                >
                                    {alert.details?.riskScore.toFixed(0)}
                                </div>
                                <span className="text-[10px] font-bold mt-1 text-gray-400">{alert.details?.riskLevel}</span>
                            </div>

                            <div className="col-span-3">
                                <p className="font-bold text-gray-200 text-lg">{alert.satellite.OBJECT_NAME}</p>
                                <p className="text-xs text-gray-500 font-mono">NORAD: {alert.satellite.NORAD_CAT_ID}</p>
                            </div>

                            <div className="col-span-2">
                                <span className="px-2 py-1 text-xs font-mono bg-gray-800 rounded text-cyan-300 border border-gray-700">
                                    {alert.satellite.OWNER}
                                </span>
                            </div>

                            <div className="col-span-3">
                                <p className="text-sm text-gray-300 line-clamp-2">
                                    {alert.details?.description || "Analysis Pending..."}
                                </p>
                            </div>

                            <div className="col-span-2">
                                <p className="text-xs font-mono text-rose-400">{alert.details?.mitreTechnique}</p>
                            </div>

                            <div className="col-span-1 text-right">
                                <button 
                                    onClick={() => onSelectSatellite(alert.satellite.NORAD_CAT_ID)}
                                    className="px-3 py-2 text-xs font-bold text-cyan-400 bg-cyan-900/20 border border-cyan-800 rounded hover:bg-cyan-900/50 transition-colors"
                                >
                                    ANALYZE
                                </button>
                            </div>
                        </div>
                    ))}

                    {sortedAlerts.length === 0 && (
                        <div className="text-center py-20 text-gray-500">
                            <p className="text-lg">No active threats detected.</p>
                            <p className="text-sm">System status is nominal.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};