
import React, { useEffect, useState, useMemo, useRef } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';
import * as satellite from 'satellite.js';
import { AnomalyAlert, RealSatellite } from '../types';
import { getRiskHexColor, RiskLevel } from '../constants';

interface MapDisplayProps {
  satelliteCatalog: RealSatellite[];
  alerts: AnomalyAlert[];
  selectedSatelliteId: number | null;
  onSelectSatellite: (satelliteId: number | null) => void;
}

interface GlobePoint {
  id: number;
  name: string;
  lat: number;
  lng: number;
  alt: number; // Relative altitude (0.1 = 10% of earth radius)
  color: string;
  radius: number;
  isAlert: boolean;
  risk?: RiskLevel;
  rec: satellite.SatRec;
}

// Earth Radius in KM
const EARTH_RADIUS_KM = 6371;

// Textures - High Quality for "Physical World" look
const EARTH_NIGHT_TEXTURE = '//unpkg.com/three-globe/example/img/earth-night.jpg';
const EARTH_TOPOLOGY_TEXTURE = '//unpkg.com/three-globe/example/img/earth-topology.png';
const BACKGROUND_URL = '//unpkg.com/three-globe/example/img/night-sky.png';

export default function MapDisplay({ satelliteCatalog, alerts, selectedSatelliteId, onSelectSatellite }: MapDisplayProps) {
    const globeEl = useRef<GlobeMethods | null>(null);
    const [points, setPoints] = useState<GlobePoint[]>([]);
    const [hoveredPoint, setHoveredPoint] = useState<GlobePoint | null>(null);

    // 1. Propagate Orbits & Prepare Points (Runs periodically)
    useEffect(() => {
        const updatePositions = () => {
            const now = new Date();
            const alertMap = new Map<number, AnomalyAlert>(alerts.map(a => [a.satellite.NORAD_CAT_ID, a]));
            
            // Limit number of satellites rendered for performance if catalog is huge
            const activeSats = satelliteCatalog.length > 3000 
                ? satelliteCatalog.filter(s => alertMap.has(s.NORAD_CAT_ID) || s.NORAD_CAT_ID % 5 === 0) // Show alerts + 20% sample
                : satelliteCatalog;

            const newPoints: GlobePoint[] = activeSats.map(sat => {
                const rec = satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);
                if (rec.error) return null;

                const positionAndVelocity = satellite.propagate(rec, now);
                if (!('position' in positionAndVelocity)) return null;

                const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;
                const gmst = satellite.gstime(now);
                const positionGd = satellite.eciToGeodetic(positionEci, gmst);

                const lat = satellite.degreesLat(positionGd.latitude);
                const lng = satellite.degreesLong(positionGd.longitude);
                const altKm = positionGd.height;
                
                // Convert KM altitude to Globe relative altitude (where 1.0 is surface)
                const altRel = Math.max(0.01, altKm / EARTH_RADIUS_KM);

                const alert = alertMap.get(sat.NORAD_CAT_ID);
                const isSelected = selectedSatelliteId === sat.NORAD_CAT_ID;

                // Coloring Logic
                let color = '#64748b'; // Default Slate
                if (alert) {
                    // Anomalies are ALWAYS colored by risk
                    // Default to 'Critical' (Red) if pending or unknown, otherwise use specific risk color
                    const rLevel = alert.details?.riskLevel || 'Critical';
                    color = getRiskHexColor(rLevel); 
                } 
                if (isSelected) {
                    // Selected overrides everything with a distinct highlight
                    color = '#22d3ee'; // Cyan-400
                }

                return {
                    id: sat.NORAD_CAT_ID,
                    name: sat.OBJECT_NAME,
                    lat,
                    lng,
                    alt: altRel,
                    color: color,
                    radius: isSelected ? 1.2 : (alert ? 0.9 : 0.3), 
                    isAlert: !!alert,
                    risk: alert?.details?.riskLevel,
                    rec
                } as GlobePoint;
            }).filter((p): p is GlobePoint => p !== null);

            setPoints(newPoints);
        };

        updatePositions();
        const interval = setInterval(updatePositions, 1000);
        return () => clearInterval(interval);
    }, [satelliteCatalog, alerts, selectedSatelliteId]);

    // 2. Camera Automation
    useEffect(() => {
        if (selectedSatelliteId && globeEl.current) {
            const point = points.find(p => p.id === selectedSatelliteId);
            if (point) {
                globeEl.current.pointOfView({
                    lat: point.lat,
                    lng: point.lng,
                    altitude: point.alt + 0.5 // Hover slightly above it
                }, 2000);
            }
        }
    }, [selectedSatelliteId]); // Only trigger on ID change


    // 3. Prepare Rings (Pulse effect for Alerts) - ONLY RIPPLES, NO BEAMS
    const ringsData = useMemo(() => {
        return points
            .filter(p => p.isAlert)
            .map(p => ({
                id: p.id, // Pass ID for click handler
                lat: p.lat,
                lng: p.lng,
                alt: p.alt,
                // Ensure the ring color matches the Risk Level
                color: getRiskHexColor(p.risk || 'Critical'),
                maxRadius: 8, // Reduced size for cleaner ripple look
                propagationSpeed: 2, 
                repeatPeriod: 1000 
            }));
    }, [points]);

    return (
        <div className="relative w-full h-full bg-gray-950">
            <Globe
                ref={globeEl}
                // Visuals
                globeImageUrl={EARTH_NIGHT_TEXTURE}
                bumpImageUrl={EARTH_TOPOLOGY_TEXTURE}
                backgroundImageUrl={BACKGROUND_URL}
                
                // Data Points
                pointsData={points}
                pointLabel="name"
                pointLat="lat"
                pointLng="lng"
                pointAltitude="alt"
                pointColor="color"
                pointRadius="radius"
                onPointClick={(point: any) => onSelectSatellite(point.id)}
                onPointHover={(point: any) => setHoveredPoint(point)}

                // Rings (Alert Ripples)
                ringsData={ringsData}
                ringColor="color"
                ringMaxRadius="maxRadius"
                ringPropagationSpeed="propagationSpeed"
                ringRepeatPeriod="repeatPeriod"
                // IMPORTANT: Allow clicking on rings to select the anomaly
                // @ts-ignore
                onRingClick={(ring: any) => onSelectSatellite(ring.id)}
                
                // Atmosphere
                atmosphereColor="#06b6d4"
                atmosphereAltitude={0.15}
                
                // Config
                enablePointerInteraction={true}
                width={window.innerWidth - 600} 
                height={window.innerHeight}
            />

            {/* Tooltip */}
            {hoveredPoint && (
                <div 
                    className="absolute z-50 pointer-events-none px-3 py-2 bg-gray-900/90 backdrop-blur border border-gray-600 rounded shadow-xl"
                    style={{ 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        marginTop: '-50px'
                    }}
                >
                    <p className="font-bold text-cyan-400">{hoveredPoint.name}</p>
                    <p className="text-xs text-gray-300">NORAD: {hoveredPoint.id}</p>
                    {hoveredPoint.isAlert && (
                        <p className="text-xs text-rose-400 font-bold mt-1 uppercase">Anomaly Detected</p>
                    )}
                </div>
            )}

             {/* Legend */}
             <div className="absolute bottom-4 left-4 z-10 pointer-events-auto">
                <div className="bg-gray-900/80 backdrop-blur-sm p-3 rounded border border-gray-700 text-xs font-mono text-gray-400 shadow-2xl">
                    <p className="font-bold text-gray-200 mb-2">VISUALIZATION LEGEND</p>
                    
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-500"></span> 
                            <span>Nominal Asset</span>
                        </div>

                        {/* Critical - Interactive Tooltip */}
                        <div className="group relative flex items-center gap-2 cursor-help">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span> 
                            <span className="text-rose-400 font-semibold">Critical (Risk &gt; 90)</span>
                            
                            <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-72 p-3 bg-gray-900 border border-gray-600 rounded-md shadow-2xl z-50">
                                <p className="text-rose-400 font-bold mb-1">CRITICAL ANOMALY</p>
                                <p className="text-gray-300 leading-relaxed">
                                    Physics: This orbit is "impossible" according to the model's learned rules. 
                                    It likely indicates a major maneuver, a breakup event, or a sensor glitch.
                                </p>
                                <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-gray-900 border-r border-b border-gray-600 rotate-45"></div>
                            </div>
                        </div>

                        {/* High - Interactive Tooltip */}
                        <div className="group relative flex items-center gap-2 cursor-help">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span> 
                            <span className="text-orange-400 font-semibold">High (Risk &gt; 70)</span>

                            <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-72 p-3 bg-gray-900 border border-gray-600 rounded-md shadow-2xl z-50">
                                <p className="text-orange-400 font-bold mb-1">HIGH SEVERITY</p>
                                <p className="text-gray-300 leading-relaxed">
                                    Physics: This orbit is statistically unlikely. It deviates significantly from the "Station-Keeping" norm 
                                    (e.g., drifting slightly faster than it should), but isn't completely chaotic.
                                </p>
                                <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-gray-900 border-r border-b border-gray-600 rotate-45"></div>
                            </div>
                        </div>

                        {/* Moderate - Interactive Tooltip */}
                        <div className="group relative flex items-center gap-2 cursor-help">
                            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]"></span> 
                            <span className="text-amber-400 font-semibold">Moderate (Risk &gt; 45)</span>

                            <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-72 p-3 bg-gray-900 border border-gray-600 rounded-md shadow-2xl z-50">
                                <p className="text-amber-400 font-bold mb-1">MODERATE DEVIATION</p>
                                <p className="text-gray-300 leading-relaxed">
                                    Physics: Detectable deviation from nominal variance. Likely represents minor station-keeping drift 
                                    or gravitational perturbations not fully accounted for.
                                </p>
                                <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-gray-900 border-r border-b border-gray-600 rotate-45"></div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 border-t border-gray-700 pt-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span> 
                            <span className="text-cyan-400">Selected Asset</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
