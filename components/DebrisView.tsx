import React, { useMemo, useState, useEffect } from 'react';
import * as satellite from 'satellite.js';
import { RealSatellite } from '../types';

interface DebrisViewProps {
    catalog: RealSatellite[];
    selectedSatId: number | null;
}

interface Conjunction {
    sat1: RealSatellite;
    sat2: RealSatellite;
    distance: number; // km
    relativeSpeed: number; // km/s
    time: string;
}

export const DebrisView: React.FC<DebrisViewProps> = ({ catalog, selectedSatId }) => {
    const [conjunctions, setConjunctions] = useState<Conjunction[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    // Filter focus to GEO belt for demo performance if no specific sat selected
    const primarySat = useMemo(() => 
        catalog.find(s => s.NORAD_CAT_ID === selectedSatId) || catalog[0], 
    [catalog, selectedSatId]);

    useEffect(() => {
        if (!primarySat || catalog.length < 2) return;

        setIsCalculating(true);
        
        // Run calculation in next tick to allow UI render
        setTimeout(() => {
            const now = new Date();
            const satrec1 = satellite.twoline2satrec(primarySat.TLE_LINE1, primarySat.TLE_LINE2);
            
            if (!satrec1 || satrec1.error) {
                setIsCalculating(false);
                return;
            }

            const posVel1 = satellite.propagate(satrec1, now);
            if (!('position' in posVel1)) {
                setIsCalculating(false);
                return;
            }
            const pos1 = posVel1.position as satellite.EciVec3<number>;
            const vel1 = posVel1.velocity as satellite.EciVec3<number>;

            const alerts: Conjunction[] = [];

            // Check against all other satellites
            for (const sat2 of catalog) {
                if (sat2.NORAD_CAT_ID === primarySat.NORAD_CAT_ID) continue;

                const satrec2 = satellite.twoline2satrec(sat2.TLE_LINE1, sat2.TLE_LINE2);
                if (!satrec2 || satrec2.error) continue;

                const posVel2 = satellite.propagate(satrec2, now);
                if (!('position' in posVel2)) continue;

                const pos2 = posVel2.position as satellite.EciVec3<number>;
                const vel2 = posVel2.velocity as satellite.EciVec3<number>;

                // Euclidean Distance
                const dist = Math.sqrt(
                    Math.pow(pos1.x - pos2.x, 2) +
                    Math.pow(pos1.y - pos2.y, 2) +
                    Math.pow(pos1.z - pos2.z, 2)
                );

                // Relative Speed
                const relSpeed = Math.sqrt(
                    Math.pow(vel1.x - vel2.x, 2) +
                    Math.pow(vel1.y - vel2.y, 2) +
                    Math.pow(vel1.z - vel2.z, 2)
                );

                // Threshold: 200km for "Proximity" in GEO (Station Keeping Boxes are tight)
                if (dist < 200) {
                    alerts.push({
                        sat1: primarySat,
                        sat2: sat2,
                        distance: dist,
                        relativeSpeed: relSpeed,
                        time: now.toLocaleTimeString()
                    });
                }
            }

            setConjunctions(alerts.sort((a, b) => a.distance - b.distance));
            setIsCalculating(false);
        }, 100);

    }, [primarySat, catalog]);

    return (
        <div className="flex-1 p-6 bg-gray-950 overflow-y-auto">
            <div className="max-w-5xl mx-auto space-y-6">
                 <div className="border-b border-gray-800 pb-4">
                    <h2 className="text-2xl font-bold text-gray-100 tracking-wide">Debris Mitigation & Conjunction Assessment</h2>
                    <p className="text-sm text-gray-400 font-mono mt-1">
                        Analyzing proximity vectors for: <span className="text-cyan-400 font-bold">{primarySat?.OBJECT_NAME || "Scanning..."}</span>
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                        <p className="text-xs text-gray-500 uppercase font-bold">Primary Asset</p>
                        <p className="text-xl font-mono text-cyan-400">{primarySat?.OBJECT_NAME}</p>
                        <p className="text-xs text-gray-600 font-mono mt-1">NORAD: {primarySat?.NORAD_CAT_ID}</p>
                    </div>
                    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                        <p className="text-xs text-gray-500 uppercase font-bold">Proximity Alerts</p>
                        <p className="text-xl font-mono text-rose-400">{conjunctions.length}</p>
                        <p className="text-xs text-gray-600 font-mono mt-1">Within 200km Radius</p>
                    </div>
                     <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                        <p className="text-xs text-gray-500 uppercase font-bold">Calculation Status</p>
                        <p className="text-xl font-mono text-green-400">{isCalculating ? "Propagating..." : "Nominal"}</p>
                        <p className="text-xs text-gray-600 font-mono mt-1">SGP4 Physics Engine</p>
                    </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-5 gap-4 px-6 py-3 bg-gray-800/50 text-xs font-bold text-gray-500 uppercase">
                        <div className="col-span-2">Secondary Object</div>
                        <div>Range (km)</div>
                        <div>Rel. Speed (km/s)</div>
                        <div>TCA (Time)</div>
                    </div>
                    {conjunctions.map((alert, idx) => (
                        <div key={idx} className="grid grid-cols-5 gap-4 px-6 py-4 border-t border-gray-800 hover:bg-gray-800/30 transition-colors">
                             <div className="col-span-2">
                                <p className="font-bold text-gray-200">{alert.sat2.OBJECT_NAME}</p>
                                <p className="text-xs text-gray-500 font-mono">NORAD: {alert.sat2.NORAD_CAT_ID} | {alert.sat2.OWNER}</p>
                            </div>
                            <div className="font-mono text-rose-400 font-bold self-center">
                                {alert.distance.toFixed(2)} km
                            </div>
                            <div className="font-mono text-gray-300 self-center">
                                {alert.relativeSpeed.toFixed(3)} km/s
                            </div>
                            <div className="font-mono text-gray-500 text-xs self-center">
                                {alert.time}
                            </div>
                        </div>
                    ))}
                    {!isCalculating && conjunctions.length === 0 && (
                        <div className="p-8 text-center text-gray-500">
                            No conjunctions detected within 200km for this asset.
                        </div>
                    )}
                </div>
                
                 <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded text-xs text-blue-200/60 leading-relaxed">
                    <strong>Note:</strong> Conjunction Assessment is performed using real-time SGP4 propagation on the client side. 
                    Distances are Euclidean approximations based on current TLE epoch.
                </div>
            </div>
        </div>
    );
};