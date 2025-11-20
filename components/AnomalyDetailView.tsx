
import React, { useState, useEffect, useMemo } from 'react';
import * as satellite from 'satellite.js';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AnomalyAlert, RealSatellite } from '../types';
import { getRiskColor } from '../constants';

interface AnomalyDetailViewProps {
    alert: AnomalyAlert;
    onBack: () => void;
    onArchive: () => void;
    onSaveNotes: (noradId: number, notes: string) => void;
}

const SatInfo: React.FC<{sat: RealSatellite}> = ({sat}) => (
     <div className="p-3 rounded-lg bg-gray-800/70">
        <p className="text-xs text-cyan-200/80 font-semibold uppercase">Asset Details</p>
        <p className="text-base font-bold text-gray-100 truncate">{sat.OBJECT_NAME}</p>
        <p className="text-xs text-gray-400 font-mono">NORAD: {sat.NORAD_CAT_ID} | Type: {sat.OBJECT_TYPE}</p>
        <p className="text-xs text-gray-400 font-mono">Owner/Country: <span className="text-cyan-300">{sat.OWNER}</span></p>
        <p className="text-xs text-gray-400 font-mono">Launched: {sat.LAUNCH_DATE}</p>
    </div>
);

const TLEInfo: React.FC<{sat: RealSatellite}> = ({sat}) => (
     <div className="p-3 rounded-lg bg-black/50 font-mono text-xs text-gray-400">
         <p className="text-cyan-200/80 font-sans text-xs font-semibold uppercase mb-1">Raw TLE Data</p>
         <p className="break-all">{sat.TLE_LINE1}</p>
         <p className="break-all">{sat.TLE_LINE2}</p>
    </div>
);

const AnalysisSection: React.FC<{title: string, content: string | undefined}> = ({title, content}) => (
     <div>
        <p className="text-xs text-cyan-200/80 font-semibold uppercase">{title}</p>
        <p className="text-sm text-gray-200 whitespace-pre-wrap">{content || "Not available."}</p>
    </div>
);

// --- SGP4 Orbital History Chart ---
const OrbitalHistoryChart: React.FC<{ sat: RealSatellite }> = ({ sat }) => {
    const historyData = useMemo(() => {
        const satrec = satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);
        if (!satrec || satrec.error) return [];

        const data = [];
        const now = new Date();
        // Generate data for past 24 hours (1440 minutes) in 15 minute steps
        for (let i = 24 * 4; i >= 0; i--) {
            const t = new Date(now.getTime() - (i * 15 * 60 * 1000));
            const positionAndVelocity = satellite.propagate(satrec, t);
            
            if ('position' in positionAndVelocity && 'velocity' in positionAndVelocity) {
                const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;
                const velocityEci = positionAndVelocity.velocity as satellite.EciVec3<number>;
                
                const gmst = satellite.gstime(t);
                const positionGd = satellite.eciToGeodetic(positionEci, gmst);
                
                const v = Math.sqrt(
                    Math.pow(velocityEci.x, 2) + 
                    Math.pow(velocityEci.y, 2) + 
                    Math.pow(velocityEci.z, 2)
                );

                data.push({
                    time: t.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    alt: Math.round(positionGd.height),
                    vel: parseFloat(v.toFixed(3))
                });
            }
        }
        return data;
    }, [sat]);

    if (historyData.length === 0) return null;

    return (
        <div className="p-3 rounded-lg bg-gray-800/70 space-y-6">
            <p className="text-xs text-cyan-200/80 font-semibold uppercase mb-1">Orbital History (Reconstructed)</p>
            
            <div className="h-48 w-full">
                <p className="text-[10px] text-gray-400 text-center mb-1">Altitude Variation (km)</p>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorAlt" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="time" tick={{fontSize: 10, fill: '#9ca3af'}} minTickGap={30} />
                        <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} domain={['auto', 'auto']} width={35} />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#111827', borderColor: '#374151', fontSize: '12px'}}
                            itemStyle={{color: '#22d3ee'}}
                        />
                        <Area type="monotone" dataKey="alt" stroke="#22d3ee" fillOpacity={1} fill="url(#colorAlt)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

             <div className="h-48 w-full mt-6">
                <p className="text-[10px] text-gray-400 text-center mb-1">Velocity Profile (km/s)</p>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorVel" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                         <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis dataKey="time" tick={{fontSize: 10, fill: '#9ca3af'}} minTickGap={30} />
                        <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} domain={['auto', 'auto']} width={35} />
                        <Tooltip 
                             contentStyle={{backgroundColor: '#111827', borderColor: '#374151', fontSize: '12px'}}
                             itemStyle={{color: '#f97316'}}
                        />
                        <Area type="monotone" dataKey="vel" stroke="#f97316" fillOpacity={1} fill="url(#colorVel)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

// --- Live Vectors ---
const OrbitalVectors: React.FC<{ sat: RealSatellite }> = ({ sat }) => {
    const [telemetry, setTelemetry] = useState({
        lat: 0,
        lng: 0,
        alt: 0,
        velocity: 0,
    });

    const satrec = useMemo(() => satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2), [sat]);

    const orbitalParams = useMemo(() => {
        const meanMotionRadMin = satrec.no; 
        const meanMotionRadSec = meanMotionRadMin / 60.0;
        const mu = 398600.4418; 
        const earthRadius = 6378.137;

        const a = Math.pow(mu / Math.pow(meanMotionRadSec, 2), 1/3);
        const e = satrec.ecco;

        const perigee = (a * (1 - e)) - earthRadius;
        const apogee = (a * (1 + e)) - earthRadius;
        const periodMins = (2 * Math.PI) / meanMotionRadMin;

        return {
            apogee: apogee.toFixed(2),
            perigee: perigee.toFixed(2),
            period: periodMins.toFixed(2),
            inclination: (satrec.inclo * 180 / Math.PI).toFixed(2) 
        };
    }, [satrec]);

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const positionAndVelocity = satellite.propagate(satrec, now);
            
            if ('position' in positionAndVelocity && 'velocity' in positionAndVelocity) {
                const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;
                const velocityEci = positionAndVelocity.velocity as satellite.EciVec3<number>;
                
                const gmst = satellite.gstime(now);
                const positionGd = satellite.eciToGeodetic(positionEci, gmst);
                
                const v = Math.sqrt(
                    Math.pow(velocityEci.x, 2) + 
                    Math.pow(velocityEci.y, 2) + 
                    Math.pow(velocityEci.z, 2)
                );

                setTelemetry({
                    lat: satellite.degreesLat(positionGd.latitude),
                    lng: satellite.degreesLong(positionGd.longitude),
                    alt: positionGd.height,
                    velocity: v
                });
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [satrec]);

    return (
        <div className="p-3 rounded-lg bg-gray-800/70 grid grid-cols-2 gap-2">
             <div className="col-span-2 mb-1">
                <p className="text-xs text-cyan-200/80 font-semibold uppercase">Real-Time Telemetry</p>
             </div>
             
             <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50">
                <p className="text-[10px] text-gray-400 uppercase">Altitude</p>
                <p className="font-mono text-sm font-bold text-cyan-300">{telemetry.alt.toFixed(1)} km</p>
             </div>
             <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50">
                <p className="text-[10px] text-gray-400 uppercase">Velocity</p>
                <p className="font-mono text-sm font-bold text-cyan-300">{telemetry.velocity.toFixed(2)} km/s</p>
             </div>

             <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50">
                <p className="text-[10px] text-gray-400 uppercase">Latitude</p>
                <p className="font-mono text-xs text-gray-300">{telemetry.lat.toFixed(4)}°</p>
             </div>
             <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50">
                <p className="text-[10px] text-gray-400 uppercase">Longitude</p>
                <p className="font-mono text-xs text-gray-300">{telemetry.lng.toFixed(4)}°</p>
             </div>

             <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50">
                <p className="text-[10px] text-gray-400 uppercase">Perigee</p>
                <p className="font-mono text-xs text-gray-300">{orbitalParams.perigee} km</p>
             </div>
             <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50">
                <p className="text-[10px] text-gray-400 uppercase">Apogee</p>
                <p className="font-mono text-xs text-gray-300">{orbitalParams.apogee} km</p>
             </div>
             <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50">
                <p className="text-[10px] text-gray-400 uppercase">Inclination</p>
                <p className="font-mono text-xs text-gray-300">{orbitalParams.inclination}°</p>
             </div>
             <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50">
                <p className="text-[10px] text-gray-400 uppercase">Period</p>
                <p className="font-mono text-xs text-gray-300">{orbitalParams.period} min</p>
             </div>
        </div>
    );
}

const ThreatClassification: React.FC<{details: AnomalyAlert['details']}> = ({ details }) => {
    if (!details) return null;
    const riskColorClass = getRiskColor(details.riskLevel).replace('border-l-4 border', 'text');
    
    return (
        <div className="p-4 rounded-lg bg-gray-800 space-y-3 relative overflow-visible z-50 border border-gray-700 shadow-lg">
             <p className="text-base text-cyan-200/80 font-bold uppercase">Threat Classification</p>
             <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="group relative">
                    <p className="text-xs text-gray-400 font-semibold flex items-center cursor-help">
                        ML RISK SCORE 
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </p>
                    <p className={`font-mono text-3xl font-bold ${riskColorClass}`}>{details.riskScore.toFixed(0)}</p>
                    
                    {/* TOOLTIP - High Z-Index, Forced on Top */}
                    <div className="absolute top-10 left-0 w-80 p-4 bg-gray-900 border border-gray-600 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-left">
                        <p className="text-xs text-gray-300 leading-relaxed">
                            <span className="font-bold text-cyan-400 block mb-1">CALCULATION METHODOLOGY</span>
                            This score is mathematically derived from the <span className="italic text-white">Reconstruction Error (MSE)</span> of the Deep Autoencoder.
                            <br/><br/>
                            The model compares the live orbital features against the learned manifold of nominal physics. Higher error = Higher Probability of Anomaly.
                        </p>
                        <div className="mt-3 h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                             <div className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" style={{width: `${details.riskScore}%`}}></div>
                        </div>
                    </div>
                </div>
                 <div>
                    <p className="text-xs text-gray-400 font-semibold">RISK LEVEL</p>
                    <p className={`font-mono text-lg font-bold ${riskColorClass}`}>{details.riskLevel}</p>
                </div>
             </div>
             <div className="border-t border-gray-700 pt-2">
                <p className="text-xs text-gray-400 font-semibold">MITRE ATT&CK® TTP</p>
                <p className="font-mono text-sm text-rose-300 font-semibold">{details.mitreTechnique}</p>
            </div>
            <div>
                <p className="text-xs text-gray-400 font-semibold">SPARTA CLASSIFICATION</p>
                <p className="font-mono text-sm text-rose-300 font-semibold">{details.spartaClassification}</p>
            </div>
        </div>
    );
};

export const AnomalyDetailView: React.FC<AnomalyDetailViewProps> = ({ alert, onBack, onArchive, onSaveNotes }) => {
    const [notes, setNotes] = useState(alert.details?.operatorNotes || '');
    const [isSaved, setIsSaved] = useState(true);

    useEffect(() => {
        setNotes(alert.details?.operatorNotes || '');
        setIsSaved(true);
    }, [alert]);

    const handleSave = () => {
        onSaveNotes(alert.satellite.NORAD_CAT_ID, notes);
        setIsSaved(true);
    };

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNotes(e.target.value);
        setIsSaved(false);
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 bg-gray-950/50 border-b border-gray-700/50 shrink-0">
                <button onClick={onBack} className="flex items-center text-sm text-cyan-400 hover:text-cyan-200 transition-colors mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Back to Anomaly Feed
                </button>
                <h2 className="text-lg font-bold tracking-wider text-gray-100 truncate">Threat Assessment</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
                {alert.analysisState === 'complete' && alert.details && (
                     <ThreatClassification details={alert.details} />
                )}

                <SatInfo sat={alert.satellite} />
                
                <OrbitalVectors sat={alert.satellite} />
                
                <OrbitalHistoryChart sat={alert.satellite} />
               
                <div className="p-4 rounded-lg bg-gray-800 space-y-3">
                    <div className="flex justify-between items-center">
                        <p className="text-base text-cyan-200/80 font-bold uppercase">ML Threat Analysis</p>
                    </div>
                     {alert.analysisState === 'complete' && alert.details ? (
                        <>
                            <AnalysisSection title="Anomaly Description" content={alert.details.description} />
                            <AnalysisSection title="Threat Assessment" content={alert.details.assessment} />
                        </>
                     ) : alert.analysisState === 'pending' ? (
                        <p className="text-sm text-gray-400">AI analysis in progress...</p>
                     ) : (
                         <p className="text-sm text-rose-400">AI analysis failed or was not performed.</p>
                     )}
                </div>
                
                <TLEInfo sat={alert.satellite} />

                <div className="p-4 rounded-lg bg-gray-800 space-y-2">
                    <p className="text-base text-cyan-200/80 font-bold uppercase">Operator Annotation</p>
                    <textarea 
                        value={notes}
                        onChange={handleNotesChange}
                        placeholder="Add your observations and notes here..."
                        className="w-full h-24 p-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                    />
                    <div className="text-right">
                        <button 
                            onClick={handleSave}
                            disabled={isSaved}
                            className="text-xs px-3 py-1 bg-cyan-700 hover:bg-cyan-600 rounded-md text-white font-semibold transition-colors disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSaved ? 'Saved' : 'Save Notes'}
                        </button>
                    </div>
                </div>

                 <div className="text-center pt-2">
                     <button 
                        onClick={(e) => { e.stopPropagation(); onArchive(); }}
                        disabled={alert.analysisState !== 'complete'}
                        className="text-sm px-4 py-2 bg-gray-700 hover:bg-cyan-800 rounded-md text-gray-300 hover:text-white transition-colors disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                    >
                        Archive Assessment
                    </button>
                </div>
            </div>
        </div>
    )
}
