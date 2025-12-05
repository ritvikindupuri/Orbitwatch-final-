import React, { useState, useEffect, useMemo } from 'react';
import * as satellite from 'satellite.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AnomalyAlert, RealSatellite } from '../types';
import { getRiskColor } from '../constants';

interface AnomalyDetailViewProps {
    alert: AnomalyAlert;
    onBack: () => void;
    onArchive: () => void;
    onSaveNotes: (noradId: number, notes: string) => void;
}

// Time Window Types
type TimeWindow = '24h' | '48h' | '7d' | '30d';

// --- Sub-Components ---

const RFOverview: React.FC<{sat: RealSatellite}> = ({sat}) => {
    // Deterministic RF mapping based on owner
    const rfData = useMemo(() => {
        let band = 'Ku / 13 GHz';
        let status = 'Nominal';
        let statusColor = 'text-green-400';

        if (sat.OWNER === 'USA') band = 'Ka / 26 GHz';
        if (sat.OWNER === 'RUSSIA (CIS)') band = 'X / 8 GHz';
        if (sat.OWNER === 'PRC') band = 'L / 1.5 GHz';
        if (sat.OWNER === 'ESA (EU)') band = 'Ku / 12 GHz';

        // Simulate anomaly in RF if it's the alerted satellite
        if (Math.random() > 0.7) {
            status = 'Signal Drift';
            statusColor = 'text-amber-400';
        }

        return { band, status, statusColor };
    }, [sat]);

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 h-full">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">RF Overview</h4>
            <div className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Approved Band</span>
                    <span className="text-xs font-mono text-gray-200">{rfData.band}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-xs text-gray-400">Captured Band</span>
                    <span className="text-xs font-mono text-gray-200">{rfData.band}</span>
                </div>
                <div className="pt-2 border-t border-gray-800 flex justify-between items-center">
                    <span className="text-xs text-gray-400">RF Anomaly</span>
                    <span className={`text-xs font-bold border px-1.5 py-0.5 rounded bg-gray-950 ${rfData.statusColor} border-current`}>
                        {rfData.status}
                    </span>
                </div>
            </div>
        </div>
    );
};

const DetailedParameters: React.FC<{sat: RealSatellite}> = ({ sat }) => {
    const satrec = useMemo(() => satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2), [sat]);
    
    return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 h-full overflow-hidden">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Orbital Parameters</h4>
                <span className="text-[10px] bg-cyan-900/30 text-cyan-400 px-1.5 rounded border border-cyan-800">TLE Epoch</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="flex justify-between">
                    <span className="text-gray-400">Inclination</span>
                    <span className="font-mono text-gray-200">{(satrec.inclo * 180 / Math.PI).toFixed(4)}°</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-400">Eccentricity</span>
                    <span className="font-mono text-gray-200">{satrec.ecco.toFixed(6)}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-400">Arg Perigee</span>
                    <span className="font-mono text-gray-200">{(satrec.argpo * 180 / Math.PI).toFixed(4)}°</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-400">RAAN</span>
                    <span className="font-mono text-gray-200">{(satrec.nodeo * 180 / Math.PI).toFixed(4)}°</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-400">Mean Motion</span>
                    <span className="font-mono text-gray-200">{(satrec.no * 1440 / (2 * Math.PI)).toFixed(4)} rev/d</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-400">BSTAR</span>
                    <span className="font-mono text-gray-200">{satrec.bstar.toExponential(3)}</span>
                </div>
            </div>
        </div>
    );
};

const HistoricalNotes: React.FC<{ alert: AnomalyAlert }> = ({ alert }) => {
    // Generate deterministic "events" based on satellite ID
    const events = useMemo(() => {
        const seed = alert.satellite.NORAD_CAT_ID;
        const baseDate = new Date(alert.timestamp);
        
        const eventTypes = [
            { code: 'RS', title: 'Unexpected Maneuver Event', desc: 'Object executed a small prograde burn inconsistent with predicted trajectory. ΔV estimated at ~0.08 m/s.' },
            { code: 'TD', title: 'RF Activity Spike', desc: 'Detected a short-duration spike in RF emissions not previously associated with this object\'s baseline signature.' },
            { code: 'SG', title: 'Closest Approach Notification', desc: 'Recorded a close pass within 4.2 km of another RSO. Collision risk assessed as Low.' },
            { code: 'AA', title: 'Pattern-of-Life Deviation', desc: 'Object\'s orbital drift rate changed from baseline average by +12%.' }
        ];

        // Pick 3 random events based on ID
        return [0, 1, 3].map((offset, idx) => {
            const typeIdx = (seed + idx) % eventTypes.length;
            const ev = eventTypes[typeIdx];
            const time = new Date(baseDate.getTime() - (offset * 3600 * 1000 * 24 * (seed % 3 + 1)));
            return { ...ev, date: time.toISOString().split('T')[0] + ' ' + time.toLocaleTimeString() };
        });
    }, [alert]);

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-0 overflow-hidden h-full flex flex-col">
            <div className="p-3 border-b border-gray-700 bg-gray-800/50">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Historical Notes</h4>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {events.map((ev, i) => (
                    <div key={i} className="flex gap-3 p-2 hover:bg-gray-800 rounded transition-colors group">
                        <div className="shrink-0 w-8 h-8 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-xs font-bold text-gray-300 group-hover:border-cyan-500 group-hover:text-cyan-400 transition-colors">
                            {ev.code}
                        </div>
                        <div className="min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <span className="text-xs font-bold text-gray-200">{ev.title}</span>
                                <span className="text-[10px] text-gray-500 font-mono">{ev.date}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-tight line-clamp-3">
                                {ev.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DeviationChart: React.FC<{ riskScore: number }> = ({ riskScore }) => {
    // Generate deviation data
    const data = useMemo(() => {
        const points = [];
        for (let i = 0; i < 24; i++) {
            const predicted = 50 + Math.sin(i * 0.5) * 10;
            // Actual deviates more if riskScore is high
            const deviationFactor = riskScore / 100; // 0 to 1
            const noise = (Math.random() - 0.5) * 20 * deviationFactor;
            const drift = (i * 1.5) * deviationFactor;
            const actual = predicted + noise + drift;
            
            points.push({
                time: `${i}h`,
                predicted,
                actual
            });
        }
        return points;
    }, [riskScore]);

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 h-full flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Deviation Analysis (24h)</h4>
                <div className="flex gap-3">
                     <div className="flex items-center gap-1">
                        <span className="w-2 h-0.5 bg-blue-500"></span>
                        <span className="text-[10px] text-gray-400">Predicted</span>
                     </div>
                     <div className="flex items-center gap-1">
                        <span className="w-2 h-0.5 bg-green-500"></span>
                        <span className="text-[10px] text-gray-400">Actual</span>
                     </div>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#111827', borderColor: '#374151', fontSize: '10px'}} 
                            itemStyle={{padding: 0}}
                        />
                        <Line type="monotone" dataKey="predicted" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={true} />
                        <Line type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={true} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const ThreatClassificationHeader: React.FC<{details: AnomalyAlert['details']}> = ({ details }) => {
    if (!details) return null;
    const riskColor = getRiskColor(details.riskLevel).replace('border', 'text');
    
    return (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex justify-between items-center shadow-lg relative overflow-hidden">
             {/* Background Pulse */}
             <div className={`absolute -right-10 -top-10 w-32 h-32 bg-${details.riskLevel === 'Critical' ? 'rose' : 'orange'}-500/10 rounded-full blur-2xl`}></div>

             <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Threat Classification</p>
                <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-4xl font-mono font-bold text-white tracking-tighter">{details.riskScore.toFixed(0)}</span>
                    <span className={`text-lg font-bold ${riskColor} uppercase`}>{details.riskLevel}</span>
                </div>
             </div>

             <div className="text-right z-10">
                 <div className="mb-1">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">MITRE ATT&CK® TTP</p>
                    <p className="text-xs font-mono text-rose-300">{details.mitreTechnique}</p>
                 </div>
                 <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">SPARTA CLASS</p>
                    <p className="text-xs font-mono text-rose-300">{details.spartaClassification}</p>
                 </div>
             </div>
        </div>
    );
};

// --- Main Component ---

export const AnomalyDetailView: React.FC<AnomalyDetailViewProps> = ({ alert, onBack, onArchive, onSaveNotes }) => {
    const [notes, setNotes] = useState(alert.details?.operatorNotes || '');
    const [isSaved, setIsSaved] = useState(true);
    const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h');
    const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());

    // Live update trigger for graphs
    useEffect(() => {
        const interval = setInterval(() => setCurrentTimestamp(Date.now()), 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setNotes(alert.details?.operatorNotes || '');
        setIsSaved(true);
        setTimeWindow('24h'); // Reset on new alert
    }, [alert]);

    const handleSave = () => {
        onSaveNotes(alert.satellite.NORAD_CAT_ID, notes);
        setIsSaved(true);
    };

    // --- Orbital History Calculation (SGP4) ---
    const historyData = useMemo(() => {
        const satrec = satellite.twoline2satrec(alert.satellite.TLE_LINE1, alert.satellite.TLE_LINE2);
        if (!satrec || satrec.error) return [];

        const points = [];
        let steps = 96; // Number of points on graph
        let stepSizeMinutes = 15; // default 24h

        if (timeWindow === '24h') { stepSizeMinutes = 15; }
        if (timeWindow === '48h') { stepSizeMinutes = 30; }
        if (timeWindow === '7d') { stepSizeMinutes = 105; } // ~1.75 hours
        if (timeWindow === '30d') { stepSizeMinutes = 450; } // ~7.5 hours

        // Current time (Live)
        const now = new Date(currentTimestamp);
        
        // Reverse propagation
        for (let i = steps; i >= 0; i--) {
            const t = new Date(now.getTime() - (i * stepSizeMinutes * 60000));
            const pv = satellite.propagate(satrec, t);

            if ('position' in pv && 'velocity' in pv) {
                 const pos = pv.position as satellite.EciVec3<number>;
                 const vel = pv.velocity as satellite.EciVec3<number>;
                 
                 const gmst = satellite.gstime(t);
                 const gd = satellite.eciToGeodetic(pos, gmst);
                 const vMag = Math.sqrt(vel.x**2 + vel.y**2 + vel.z**2);

                 points.push({
                     time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                     alt: gd.height,
                     vel: vMag
                 });
            }
        }
        return points;
    }, [alert, timeWindow, currentTimestamp]);


    return (
        <div className="flex flex-col h-full bg-gray-950">
            {/* Header */}
            <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 shrink-0 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h2 className="text-base font-bold text-gray-100">{alert.satellite.OBJECT_NAME}</h2>
                        <p className="text-[10px] text-gray-500 font-mono">NORAD: {alert.satellite.NORAD_CAT_ID}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                     <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-300 border border-gray-700">
                        {alert.satellite.OWNER}
                     </span>
                     <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-300 border border-gray-700">
                        {alert.satellite.OBJECT_TYPE}
                     </span>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* 1. Threat Header */}
                <ThreatClassificationHeader details={alert.details} />

                {/* 2. Grid Layout: Deviation & History Notes */}
                <div className="grid grid-cols-3 gap-4 h-48">
                    <div className="col-span-2 h-full">
                        <DeviationChart riskScore={alert.details?.riskScore || 0} />
                    </div>
                    <div className="col-span-1 h-full">
                        <HistoricalNotes alert={alert} />
                    </div>
                </div>

                {/* 3. Grid Layout: RF & Params */}
                <div className="grid grid-cols-2 gap-4 h-40">
                    <RFOverview sat={alert.satellite} />
                    <DetailedParameters sat={alert.satellite} />
                </div>

                {/* 4. Orbital History Chart */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                     <div className="flex justify-between items-center mb-4">
                        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            Orbital Reconstruction
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        </h4>
                        <div className="flex bg-gray-950 rounded border border-gray-800 p-0.5">
                            {(['24h', '48h', '7d', '30d'] as TimeWindow[]).map(tw => (
                                <button
                                    key={tw}
                                    onClick={() => setTimeWindow(tw)}
                                    className={`px-2 py-0.5 text-[10px] font-mono rounded-sm transition-colors
                                        ${timeWindow === tw 
                                            ? 'bg-cyan-900 text-cyan-300' 
                                            : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    {tw.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="h-48 grid grid-rows-2 gap-2">
                        {/* Altitude Chart */}
                        <div className="w-full h-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historyData}>
                                    <defs>
                                        <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#111827', borderColor: '#374151', fontSize: '10px'}} 
                                        itemStyle={{padding: 0}}
                                        formatter={(val: number) => [val.toFixed(2), 'km']}
                                        labelStyle={{display:'none'}}
                                    />
                                    <Area type="monotone" dataKey="alt" stroke="#22d3ee" fillOpacity={1} fill="url(#colorAlt)" strokeWidth={2} isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                            <span className="absolute top-1 left-2 text-[10px] text-cyan-500 font-bold opacity-75">Altitude (km)</span>
                        </div>

                         {/* Velocity Chart */}
                         <div className="w-full h-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historyData}>
                                    <defs>
                                        <linearGradient id="colorVel" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#111827', borderColor: '#374151', fontSize: '10px'}} 
                                        itemStyle={{padding: 0}}
                                        formatter={(val: number) => [val.toFixed(3), 'km/s']}
                                        labelStyle={{display:'none'}}
                                    />
                                    <Area type="monotone" dataKey="vel" stroke="#f97316" fillOpacity={1} fill="url(#colorVel)" strokeWidth={2} isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                            <span className="absolute top-1 left-2 text-[10px] text-orange-500 font-bold opacity-75">Velocity (km/s)</span>
                        </div>
                    </div>
                </div>

                {/* 5. Operator Notes */}
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                         <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Analyst Annotation</h4>
                         <button 
                            onClick={handleSave}
                            disabled={isSaved}
                            className="text-[10px] font-bold px-2 py-0.5 bg-cyan-900/50 text-cyan-400 border border-cyan-800 rounded hover:bg-cyan-900 transition-colors disabled:opacity-50"
                        >
                            {isSaved ? 'SAVED' : 'SAVE'}
                        </button>
                    </div>
                    <textarea 
                        value={notes}
                        onChange={(e) => { setNotes(e.target.value); setIsSaved(false); }}
                        className="w-full h-20 bg-gray-950 border border-gray-800 rounded p-2 text-xs text-gray-300 focus:outline-none focus:border-cyan-700 transition-colors resize-none"
                        placeholder="Enter assessment notes..."
                    />
                </div>

                <div className="pt-2 pb-6 flex justify-center">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onArchive(); }}
                        className="text-xs px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-600 transition-colors uppercase tracking-wider font-bold"
                    >
                        Archive Assessment
                    </button>
                </div>
            </div>
        </div>
    );
};