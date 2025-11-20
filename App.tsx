
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AnomalyAlert, RealSatellite, AnomalyDetails } from './types';
import { Header } from './components/Header';
import { GlobalStatsBar } from './components/GlobalStatsBar';
import { DashboardPanel } from './components/DashboardPanel';
import MapDisplay from './components/MapDisplay';
import { ArchiveModal } from './components/ArchiveModal';
import { fetchSpaceTrackCatalog } from './services/satelliteData';
import { generateAnomalyAnalysis, trainModelOnCatalog } from './services/tensorFlowService';
import { SpaceTrackLogin } from './components/SpaceTrackLogin';

const MAX_ALERTS = 100;

export const App: React.FC = () => {
  // Login State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false); // General loading (training etc)
  const [loadingMessage, setLoadingMessage] = useState('');
  const [selectedSatelliteId, setSelectedSatelliteId] = useState<number | null>(null);
  
  // Live Data & Analysis State
  const [satelliteCatalog, setSatelliteCatalog] = useState<RealSatellite[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [archivedAlerts, setArchivedAlerts] = useState<AnomalyAlert[]>([]);
  // Analysis is ALWAYS active once logged in
  const [isAnalysisActive, setIsAnalysisActive] = useState(true); 
  const [analysisInterval, setAnalysisInterval] = useState(7000);
  
  const analysisIntervalRef = useRef<number | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  
  const handleLogin = async (identity: string, password: string) => {
      setLoginLoading(true);
      setLoginError(null);
      try {
          // 1. Fetch Data (Will fallback to cached snapshot if CORS blocks it)
          const catalog = await fetchSpaceTrackCatalog(identity, password);
          setSatelliteCatalog(catalog);
          
          // 2. Train Model
          setLoginLoading(false); 
          setIsLoading(true);
          setLoadingMessage("Initializing TensorFlow.js Environment...");
          
          // Give UI a moment to render the loading screen
          setTimeout(async () => {
              try {
                  await trainModelOnCatalog(catalog, (msg) => setLoadingMessage(msg));
                  setIsLoading(false);
                  setIsAuthenticated(true); // Enter Main App
                  setIsAnalysisActive(true); // Start analysis loop
              } catch (trainErr) {
                   setIsLoading(false);
                   if (trainErr instanceof Error) setLoginError(`Model Training Failed: ${trainErr.message}`);
              }
          }, 100);

      } catch (e) {
          setLoginLoading(false);
          setIsLoading(false);
          if (e instanceof Error) {
              setLoginError(e.message);
          } else {
              setLoginError("An unknown error occurred connecting to Space-Track.");
          }
      }
  };

  // Core analysis logic
  useEffect(() => {
    if (isAnalysisActive && satelliteCatalog.length > 0 && isAuthenticated) {
      analysisIntervalRef.current = window.setInterval(async () => {
        // Pick a random satellite that doesn't already have an active alert
        const nonAlertedSats = satelliteCatalog.filter(sat => 
            !alerts.some(alert => alert.satellite.NORAD_CAT_ID === sat.NORAD_CAT_ID)
        );
        
        if (nonAlertedSats.length === 0) {
          // Clear some old alerts to keep the simulation running
          if (alerts.length > 10) {
             setAlerts(prev => prev.slice(0, 5));
          }
          return;
        }
        
        const targetSat = nonAlertedSats[Math.floor(Math.random() * nonAlertedSats.length)];

        const pendingAlert: AnomalyAlert = {
          satellite: targetSat,
          analysisState: 'pending',
          timestamp: Date.now()
        };
        
        setAlerts(prev => [pendingAlert, ...prev.slice(0, MAX_ALERTS - 1)]);
        
        try {
          const analysisDetails = await generateAnomalyAnalysis(targetSat);
            
          setAlerts(prev => prev.map(a => 
            a.timestamp === pendingAlert.timestamp 
              ? { ...a, analysisState: 'complete', details: analysisDetails }
              : a
          ));
        } catch (error) {
           console.error(`Failed to get AI analysis for ${targetSat.OBJECT_NAME}`, error);
           setAlerts(prev => prev.map(a => 
            a.timestamp === pendingAlert.timestamp 
              ? { ...a, analysisState: 'failed' }
              : a
          ));
        }
      }, analysisInterval);

      return () => {
        if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
      };
    }
  }, [isAnalysisActive, satelliteCatalog, alerts, isAuthenticated, analysisInterval]);

  const handleArchiveAlert = useCallback((satelliteId: number) => {
      const alertToArchive = alerts.find(a => a.satellite.NORAD_CAT_ID === satelliteId);
      if (alertToArchive) {
          setArchivedAlerts(prev => [alertToArchive, ...prev]);
          setAlerts(prev => prev.filter(a => a.satellite.NORAD_CAT_ID !== satelliteId));
          if (selectedSatelliteId === satelliteId) {
              setSelectedSatelliteId(null);
          }
      }
  }, [alerts, selectedSatelliteId]);

  const handleSaveNotes = useCallback((noradId: number, notes: string) => {
      setAlerts(prev => prev.map(alert => {
          if (alert.satellite.NORAD_CAT_ID === noradId && alert.details) {
              return {
                  ...alert,
                  details: { ...alert.details, operatorNotes: notes }
              };
          }
          return alert;
      }));
  }, []);

  const handleLoadArchives = (files: FileList) => {
      Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (e) => {
              try {
                  const content = e.target?.result as string;
                  const parsed = JSON.parse(content);
                  // Basic validation could be added here
                  setArchivedAlerts(prev => [...prev, ...parsed]);
              } catch (err) {
                  console.error("Failed to parse archive file", err);
              }
          };
          reader.readAsText(file);
      });
  };

  const filterOptions = useMemo(() => {
      const countries = Array.from(new Set(satelliteCatalog.map(s => s.OWNER))).sort();
      const types = Array.from(new Set(satelliteCatalog.map(s => s.OBJECT_TYPE))).sort();
      return { countries, types };
  }, [satelliteCatalog]);


  // 1. Render Login Screen
  if (!isAuthenticated && !isLoading) {
      return (
          <SpaceTrackLogin 
             onLogin={handleLogin}
             isLoading={loginLoading}
             error={loginError}
          />
      );
  }

  // 2. Render Training/Loading Screen
  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white">
              <div className="w-64 mb-6">
                  <div className="h-2 w-full bg-gray-800 rounded overflow-hidden">
                      <div className="h-full bg-cyan-500 animate-progress-indeterminate"></div>
                  </div>
              </div>
              <div className="flex items-center space-x-3">
                   <svg className="animate-spin h-5 w-5 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-lg font-mono text-cyan-400">{loadingMessage}</p>
              </div>
              <p className="mt-2 text-xs text-gray-500 font-mono">Training Deep Autoencoder on {satelliteCatalog.length} objects...</p>
          </div>
      );
  }

  // 3. Render Main App
  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden text-gray-100 font-sans">
      <Header 
        onClearSession={() => window.location.reload()}
        isDemoMode={false}
      />
      
      <GlobalStatsBar alerts={alerts} satelliteCount={satelliteCatalog.length} />

      <div className="flex-1 relative flex overflow-hidden">
        <div className="flex-1 relative z-0">
            <MapDisplay 
                satelliteCatalog={satelliteCatalog}
                alerts={alerts}
                selectedSatelliteId={selectedSatelliteId}
                onSelectSatellite={setSelectedSatelliteId}
            />
        </div>
        
        <div className="relative z-10">
            <DashboardPanel 
                alerts={alerts}
                selectedSatelliteId={selectedSatelliteId}
                onSelectSatellite={setSelectedSatelliteId}
                onArchiveAlert={handleArchiveAlert}
                onOpenArchive={() => setIsArchiveOpen(true)}
                onSaveNotes={handleSaveNotes}
                filterOptions={filterOptions}
                isSystemReady={isAuthenticated}
            />
        </div>
      </div>

      <ArchiveModal 
        isOpen={isArchiveOpen} 
        onClose={() => setIsArchiveOpen(false)} 
        archivedAlerts={archivedAlerts}
        onLoadArchives={handleLoadArchives}
        onClearArchives={() => setArchivedAlerts([])}
      />

      {/* Custom Keyframes for loading bar */}
      <style>{`
        @keyframes progress-indeterminate {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 50%; margin-left: 25%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
