
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Map, { Source, Layer, Marker, NavigationControl, MapRef } from 'react-map-gl';
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
  alt: number; 
  color: string;
  isAlert: boolean;
  risk?: RiskLevel;
}

// Default to a dark map style if token is valid
const MAP_STYLE = "mapbox://styles/mapbox/satellite-v9";

export default function MapDisplay({ satelliteCatalog, alerts, selectedSatelliteId, onSelectSatellite }: MapDisplayProps) {
    const mapRef = useRef<MapRef>(null);
    const [mapboxToken, setMapboxToken] = useState<string>('');
    const [isTokenSet, setIsTokenSet] = useState(false);
    const [satellites, setSatellites] = useState<SatellitePoint[]>([]);
    const [viewState, setViewState] = useState({
        longitude: -95,
        latitude: 30,
        zoom: 1.5,
        bearing: 0,
        pitch: 0
    });

    // 1. Handle API Key Submission
    const handleTokenSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mapboxToken.trim().length > 0) {
            setIsTokenSet(true);
        }
    };

    // 2. Propagate Orbits (Runs periodically)
    useEffect(() => {
        const updatePositions = () => {
            const now = new Date();
            const alertMap = new Map<number, AnomalyAlert>(alerts.map(a => [a.satellite.NORAD_CAT_ID, a]));
            
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
                const altKm = positionGd.height;

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
                    alt: altKm,
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

    // 3. Automated Camera Movement
    useEffect(() => {
        if (selectedSatelliteId && mapRef.current) {
            const target = satellites.find(s => s.id === selectedSatelliteId);
            if (target) {
                mapRef.current.flyTo({
                    center: [target.lng, target.lat],
                    zoom: 4,
                    speed: 1.2,
                    curve: 1
                });
            }
        }
    }, [selectedSatelliteId, satellites]); // Dependent on satellites updating to find target

    // 4. Data Preparation for Mapbox Layers
    const { geoJsonData, anomalyMarkers } = useMemo(() => {
        // FeatureCollection for Standard Satellites (WebGL Layer)
        const features = satellites.map(s => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
            properties: {
                id: s.id,
                color: s.color,
                radius: s.id === selectedSatelliteId ? 6 : 3,
                isAlert: s.isAlert
            }
        }));

        const geoJson = { type: 'FeatureCollection', features };

        // Separate array for Anomalies (React Markers for Pulsing Effect)
        const anomalies = satellites.filter(s => s.isAlert);

        return { geoJsonData: geoJson, anomalyMarkers: anomalies };
    }, [satellites, selectedSatelliteId]);

    const handleLayerClick = useCallback((event: any) => {
        const feature = event.features && event.features[0];
        if (feature) {
            onSelectSatellite(feature.properties.id);
        }
    }, [onSelectSatellite]);

    // RENDER: Token Input Overlay
    if (!isTokenSet) {
        return (
            <div className="relative w-full h-full bg-gray-950 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl p-8 shadow-2xl text-center">
                    <div className="mb-4">
                        <svg className="w-12 h-12 mx-auto text-cyan-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h2 className="text-xl font-bold text-gray-100">Mapbox Authorization</h2>
                        <p className="text-sm text-gray-400 mt-2">
                            Enter your Mapbox Public Access Token to enable the high-definition 3D globe renderer.
                        </p>
                    </div>
                    
                    <form onSubmit={handleTokenSubmit} className="space-y-4">
                        <input 
                            type="text" 
                            className="w-full p-3 bg-gray-950 border border-gray-700 rounded-md text-gray-200 text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                            placeholder="pk.eyJ1..."
                            value={mapboxToken}
                            onChange={(e) => setMapboxToken(e.target.value)}
                            required
                        />
                        <button 
                            type="submit"
                            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-md transition-colors"
                        >
                            Launch Visualization
                        </button>
                    </form>
                    <p className="mt-4 text-xs text-gray-500">
                        Don't have a token? <a href="https://account.mapbox.com/" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">Get one free from Mapbox</a>.
                    </p>
                </div>
            </div>
        );
    }

    // RENDER: Map
    return (
        <div className="relative w-full h-full bg-gray-950">
            <Map
                ref={mapRef}
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                mapboxAccessToken={mapboxToken}
                mapStyle={MAP_STYLE}
                projection="globe"
                fog={{
                    "range": [0.5, 10],
                    "color": "#030712", // gray-950
                    "horizon-blend": 0.3,
                    "high-color": "#082f49", // sky-950
                    "space-color": "#030712",
                    "star-intensity": 0.4
                }}
                terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
                onClick={(e) => onSelectSatellite(null)} // Deselect on background click
                interactiveLayerIds={['satellites-layer']}
                onMouseEnter={() => mapRef.current?.getCanvas().style.setProperty('cursor', 'pointer')}
                onMouseLeave={() => mapRef.current?.getCanvas().style.removeProperty('cursor')}
            >
                {/* 1. Terrain Source for 3D Globe Depth */}
                <Source
                    id="mapbox-dem"
                    type="raster-dem"
                    url="mapbox://mapbox.mapbox-terrain-dem-v1"
                    tileSize={512}
                    maxzoom={14}
                />

                {/* 2. Standard Satellites Layer (WebGL) */}
                <Source id="satellites-source" type="geojson" data={geoJsonData}>
                    <Layer
                        id="satellites-layer"
                        type="circle"
                        paint={{
                            'circle-radius': ['get', 'radius'],
                            'circle-color': ['get', 'color'],
                            'circle-opacity': 0.8,
                            'circle-stroke-width': 1,
                            'circle-stroke-color': '#000000'
                        }}
                        onClick={handleLayerClick}
                    />
                </Source>

                {/* 3. Anomalies (Pulsing Markers) */}
                {anomalyMarkers.map(p => (
                    <Marker
                        key={p.id}
                        longitude={p.lng}
                        latitude={p.lat}
                        anchor="center"
                        onClick={(e) => {
                            e.originalEvent.stopPropagation();
                            onSelectSatellite(p.id);
                        }}
                    >
                        <div className="relative group cursor-pointer">
                            {/* Pulsing Ring - CSS Animation */}
                            <div 
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 opacity-75 animate-ping"
                                style={{ borderColor: p.color }}
                            ></div>
                            {/* Inner Dot */}
                            <div 
                                className="relative w-4 h-4 rounded-full border-2 border-white shadow-lg"
                                style={{ backgroundColor: p.color }}
                            ></div>
                            
                            {/* Tooltip on Hover */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                {p.name}
                                {p.risk && <span className="block font-bold text-[10px] uppercase" style={{ color: p.color }}>{p.risk} Risk</span>}
                            </div>
                        </div>
                    </Marker>
                ))}
                
                <NavigationControl position="bottom-right" />
            </Map>
            
            {/* Legend (Re-used) */}
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
                    </div>
                </div>
            </div>
        </div>
    );
}
