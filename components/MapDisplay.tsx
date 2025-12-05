
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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

interface SatellitePoint {
  id: number;
  name: string;
  lat: number;
  lng: number;
  alt: number; // Normalized altitude for visibility
  color: string;
  isAlert: boolean;
  risk?: RiskLevel;
}

interface AnomalyRing {
  lat: number;
  lng: number;
  color: string;
  maxRadius: number;
  propagationSpeed: number;
  repeatPeriod: number;
  id: number;
}

interface OrbitalPath {
    coords: [number, number, number][]; // [lat, lng, alt]
    color: string;
}

export default function MapDisplay({ satelliteCatalog, alerts, selectedSatelliteId, onSelectSatellite }: MapDisplayProps) {
    const globeEl = useRef<GlobeMethods | undefined>(undefined);
    const [satellites, setSatellites] = useState<SatellitePoint[]>([]);
    const [orbitalPath, setOrbitalPath] = useState<OrbitalPath[]>([]);

    // 1. Propagate Orbits (Runs periodically)
    useEffect(() => {
        const updatePositions = () => {
            const now = new Date();
            // Use native Map to avoid naming conflicts with component names if any
            const alertMap = new Map<number, AnomalyAlert>();
            alerts.forEach(a => alertMap.set(a.satellite.NORAD_CAT_ID, a));
            
            // Limit number of rendered sats for performance if catalog is massive
            const activeSats = satelliteCatalog.length > 4000 
                ? satelliteCatalog.filter(s => alertMap.has(s.NORAD_CAT_ID) || s.NORAD_CAT_ID % 5 === 0) 
                : satelliteCatalog;

            const newPoints = activeSats.map((sat): SatellitePoint | null => {
                const rec = satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);
                if (rec.error) return null;

                const positionAndVelocity = satellite.propagate(rec, now);
                if (!('position' in positionAndVelocity)) return null;

                const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;
                const gmst = satellite.gstime(now);
                const positionGd = satellite.eciToGeodetic(positionEci, gmst);

                const lat = satellite.degreesLat(positionGd.latitude);
                const lng = satellite.degreesLong(positionGd.longitude);
                // Scale altitude for visibility (LEO is close to 0, GEO is higher)
                // Earth Radius ~6371km. 
                const alt = positionGd.height / 6371.0; 

                const alert = alertMap.get(sat.NORAD_CAT_ID);
                const isSelected = selectedSatelliteId === sat.NORAD_CAT_ID;

                // Coloring Logic
                let color = '#94a3b8'; // slate-400
                if (alert) {
                    const rLevel = alert.details?.riskLevel || 'Critical';
                    color = getRiskHexColor(rLevel); 
                } 
                if (isSelected) {
                    color = '#22d3ee'; // Cyan-400
                }

                return {
                    id: sat.NORAD_CAT_ID,
                    name: sat.OBJECT_NAME,
                    lat,
                    lng,
                    alt: Math.max(0.1, alt * 0.8), // Minimum altitude to appear above surface
                    color,
                    isAlert: !!alert,
                    risk: alert?.details?.riskLevel
                };
            }).filter((p): p is SatellitePoint => p !== null);

            setSatellites(newPoints);
        };

        updatePositions();
        const interval = setInterval(updatePositions, 1000);
        return () => clearInterval(interval);
    }, [satelliteCatalog, alerts, selectedSatelliteId]);

    // 2. Prepare Data Layers
    const { ringsData } = useMemo(() => {
        const rings: AnomalyRing[] = satellites
            .filter(s => s.isAlert)
            .map(s => ({
                id: s.id,
                lat: s.lat,
                lng: s.lng,
                color: s.color,
                maxRadius: 8, // Ripple effect radius
                propagationSpeed: 2,
                repeatPeriod: 800
            }));
        return { ringsData: rings };
    }, [satellites]);

    // 3. Calculate Projected Orbital Path for Selected Satellite
    useEffect(() => {
        if (!selectedSatelliteId) {
            setOrbitalPath([]);
            return;
        }

        const sat = satelliteCatalog.find(s => s.NORAD_CAT_ID === selectedSatelliteId);
        if (!sat) return;

        const satrec = satellite.twoline2satrec(sat.TLE_LINE1, sat.TLE_LINE2);
        if (!satrec || satrec.error) return;

        const now = new Date();
        const coords: [number, number, number][] = [];

        // Predict 24 hours into the future (1440 minutes)
        // Step size: 5 minutes (288 points) for smooth visualization without heavy performance cost
        for (let i = 0; i < 1440; i += 5) {
            const t = new Date(now.getTime() + i * 60000); // i minutes in future
            const positionAndVelocity = satellite.propagate(satrec, t);
            
            if ('position' in positionAndVelocity) {
                 const positionEci = positionAndVelocity.position as satellite.EciVec3<number>;
                 const gmst = satellite.gstime(t);
                 const positionGd = satellite.eciToGeodetic(positionEci, gmst);
                 
                 const lat = satellite.degreesLat(positionGd.latitude);
                 const lng = satellite.degreesLong(positionGd.longitude);
                 // Normalize altitude consistent with pointsData (min altitude clamping not strictly needed for path, but good for consistency)
                 const alt = positionGd.height / 6371.0; 
                 // Slightly lift path to avoid z-fighting with earth surface if altitude is very low
                 const safeAlt = Math.max(0.01, alt);

                 coords.push([lat, lng, safeAlt]);
            }
        }

        // Determine path color based on alert status
        const alert = alerts.find(a => a.satellite.NORAD_CAT_ID === selectedSatelliteId);
        let pathColor = '#22d3ee'; // Default Cyan
        if (alert?.details?.riskLevel) {
            pathColor = getRiskHexColor(alert.details.riskLevel);
        }

        setOrbitalPath([{ coords, color: pathColor }]);

    }, [selectedSatelliteId, satelliteCatalog, alerts]);


    // 4. Camera Interaction
    useEffect(() => {
        if (selectedSatelliteId && globeEl.current) {
            const target = satellites.find(s => s.id === selectedSatelliteId);
            if (target) {
                globeEl.current.pointOfView({ lat: target.lat, lng: target.lng, altitude: target.alt + 0.5 }, 1500);
            }
        }
    }, [selectedSatelliteId, satellites]);

    const handlePointClick = useCallback((point: object) => {
        const p = point as SatellitePoint;
        if (p && p.id) {
            onSelectSatellite(p.id);
        }
    }, [onSelectSatellite]);

    // This handles clicks on the rings (anomalies)
    const handleRingClick = useCallback((ring: object) => {
        // cast ring to expected type
        const r = ring as AnomalyRing;
        if (r && r.id) {
            onSelectSatellite(r.id);
        }
    }, [onSelectSatellite]);


    return (
        <div className="relative w-full h-full bg-gray-950">
            <Globe
                ref={globeEl}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                
                // Satellite Points
                pointsData={satellites}
                pointLat="lat"
                pointLng="lng"
                pointAltitude="alt"
                pointColor="color"
                pointRadius={(d: any) => d.id === selectedSatelliteId ? 1.5 : (d.isAlert ? 1.2 : 0.4)}
                onPointClick={handlePointClick}
                pointLabel={(d: any) => `
                    <div style="background: rgba(17, 24, 39, 0.9); border: 1px solid #374151; padding: 4px 8px; border-radius: 4px; font-family: monospace;">
                        <strong style="color: #e5e7eb">${d.name}</strong><br/>
                        <span style="color: ${d.color}; font-size: 10px;">${d.risk || 'Nominal'}</span>
                    </div>
                `}

                // Anomaly Ripples
                ringsData={ringsData}
                ringColor="color"
                ringMaxRadius="maxRadius"
                ringPropagationSpeed="propagationSpeed"
                ringRepeatPeriod="repeatPeriod"
                // @ts-ignore - onRingClick is valid in runtime but missing in some type definitions
                onRingClick={handleRingClick}

                // Orbital Paths (Predicted 24h)
                pathsData={orbitalPath}
                pathPoints="coords"
                pathPointLat={(p: any) => p[0]}
                pathPointLng={(p: any) => p[1]}
                pathPointAlt={(p: any) => p[2]}
                pathColor={(d: any) => d.color}
                pathStroke={1.5}
                pathDashLength={0.5}
                pathDashGap={0.2}
                pathDashAnimateTime={2000} // Speed of the flow animation
                pathResolution={2} // Number of interpolation points

                // Atmosphere
                atmosphereColor="#3b82f6"
                atmosphereAltitude={0.15}
            />

            {/* Legend Overlay */}
            <div className="absolute bottom-4 left-4 z-10 pointer-events-auto">
                <div className="bg-gray-900/80 backdrop-blur-sm p-3 rounded border border-gray-700 text-xs font-mono text-gray-400 shadow-2xl">
                    <p className="font-bold text-gray-200 mb-2">VISUALIZATION LEGEND</p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span> 
                            <span>Nominal Asset</span>
                        </div>
                         {/* Critical Tooltip */}
                         <div className="group relative flex items-center gap-2 cursor-help">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> 
                            <span className="text-rose-400 font-semibold">Critical (Risk &gt; 90)</span>
                             <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-72 p-3 bg-gray-900 border border-gray-600 rounded-md shadow-2xl z-50">
                                <p className="text-rose-400 font-bold mb-1">CRITICAL ANOMALY</p>
                                <p className="text-gray-300 leading-relaxed">Physics: Orbit is "impossible" according to learned rules. Major maneuver or breakup.</p>
                            </div>
                        </div>
                         {/* High Tooltip */}
                         <div className="group relative flex items-center gap-2 cursor-help">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> 
                            <span className="text-orange-400 font-semibold">High (Risk &gt; 70)</span>
                             <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-72 p-3 bg-gray-900 border border-gray-600 rounded-md shadow-2xl z-50">
                                <p className="text-orange-400 font-bold mb-1">HIGH SEVERITY</p>
                                <p className="text-gray-300 leading-relaxed">Physics: Statistically unlikely. Deviates significantly from station-keeping norm.</p>
                            </div>
                        </div>
                         {/* Moderate Tooltip */}
                         <div className="group relative flex items-center gap-2 cursor-help">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span> 
                            <span className="text-amber-400 font-semibold">Moderate (Risk &gt; 45)</span>
                             <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-72 p-3 bg-gray-900 border border-gray-600 rounded-md shadow-2xl z-50">
                                <p className="text-amber-400 font-bold mb-1">MODERATE DEVIATION</p>
                                <p className="text-gray-300 leading-relaxed">Physics: Detectable deviation. Minor drift or perturbation.</p>
                            </div>
                        </div>
                         {/* Low Tooltip */}
                         <div className="group relative flex items-center gap-2 cursor-help">
                            <span className="w-2 h-2 rounded-full bg-sky-400"></span> 
                            <span className="text-sky-400 font-semibold">Low (Risk &gt; 20)</span>
                             <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-72 p-3 bg-gray-900 border border-gray-600 rounded-md shadow-2xl z-50">
                                <p className="text-sky-400 font-bold mb-1">LOW VARIANCE</p>
                                <p className="text-gray-300 leading-relaxed">Physics: Minor variance within standard margins (drag/solar pressure).</p>
                            </div>
                        </div>
                         {/* Informational Tooltip */}
                         <div className="group relative flex items-center gap-2 cursor-help">
                            <span className="w-2 h-2 rounded-full bg-gray-500"></span> 
                            <span className="text-gray-400 font-semibold">Informational</span>
                             <div className="hidden group-hover:block absolute left-0 bottom-full mb-2 w-72 p-3 bg-gray-900 border border-gray-600 rounded-md shadow-2xl z-50">
                                <p className="text-gray-400 font-bold mb-1">NOMINAL BEHAVIOR</p>
                                <p className="text-gray-300 leading-relaxed">Physics: Reconstruction Error (MSE) is negligible (&lt;0.005). Adheres perfectly to learned physics.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
