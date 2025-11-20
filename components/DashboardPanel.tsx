
import React, { useState, useMemo, useEffect } from 'react';
import { AnomalyAlert } from '../types';
import { getRiskColor, getRiskHoverColor } from '../constants';
import { RiskDistributionChart } from './RiskDistributionChart';
import { AnomalyDetailView } from './AnomalyDetailView';

interface DashboardPanelProps {
  alerts: AnomalyAlert[];
  selectedSatelliteId: number | null;
  onSelectSatellite: (satelliteId: number | null) => void;
  onArchiveAlert: (satelliteId: number) => void;
  onOpenArchive: () => void;
  onSaveNotes: (noradId: number, notes: string) => void;
  filterOptions: { countries: string[], types: string[] };
  isSystemReady: boolean;
}

const AnomalyItem: React.FC<{
    alert: AnomalyAlert;
    isSelected: boolean;
    onSelect: () => void;
}> = ({ alert, isSelected, onSelect }) => {
    const riskColor = getRiskColor(alert.details?.riskLevel);
    const hoverColor = getRiskHoverColor(alert.details?.riskLevel);
    
    return (
        <div 
            onClick={onSelect}
            className={`p-3 rounded-md border-l-4 transition-all cursor-pointer ${riskColor}
                ${isSelected 
                    ? `bg-cyan-900/50 ring-2 ring-cyan-500`
                    : `bg-gray-800/60 ${hoverColor}`}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-100 truncate" title={alert.satellite.OBJECT_NAME}>
                        {alert.satellite.OBJECT_NAME}
                    </p>
                    <p className="text-xs text-gray-400 font-mono truncate" title={alert.details?.description}>
                       {alert.analysisState === 'pending' ? 'Analyzing...' : (alert.details?.description || 'No details available.')}
                    </p>
                </div>
                {alert.details && (
                    <div className={`ml-2 text-right text-xs font-bold ${riskColor.replace('border', 'text')}`}>{alert.details.riskLevel}</div>
                )}
                 {alert.analysisState === 'pending' && (
                    <svg className="animate-spin ml-2 h-4 w-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                 )}
            </div>
        </div>
    )
}

const FilterControl: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
    disabled: boolean;
}> = ({ label, value, onChange, options, disabled }) => (
    <div className="flex-1">
        <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full p-1.5 text-sm bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-800/50 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
            <option value="all">All</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

export const DashboardPanel: React.FC<DashboardPanelProps> = ({ 
    alerts,
    selectedSatelliteId,
    onSelectSatellite,
    onArchiveAlert,
    onOpenArchive,
    onSaveNotes,
    filterOptions,
    isSystemReady,
}) => {
    
    const [inputValue, setInputValue] = useState(''); // Immediate input state
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(''); // Delayed state for filtering
    const [countryFilter, setCountryFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const selectedAlert = useMemo(() => {
        return alerts.find(s => s.satellite.NORAD_CAT_ID === selectedSatelliteId) || null;
    }, [selectedSatelliteId, alerts]);

    // Debounce Effect: Wait 300ms after user stops typing to update the filter logic
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(inputValue);
        }, 300);
        return () => clearTimeout(timer);
    }, [inputValue]);

    // Optimized Filtering
    const filteredAlerts = useMemo(() => {
        if (!isSystemReady) return [];
        
        // Lowercase once for efficiency
        const query = debouncedSearchQuery.toLowerCase().trim();
        
        return alerts.filter(alert => {
            // 1. Search Filter
            let matchesSearch = true;
            if (query) {
                matchesSearch = 
                    alert.satellite.OBJECT_NAME.toLowerCase().includes(query) ||
                    alert.satellite.NORAD_CAT_ID.toString().includes(query) ||
                    (alert.details?.riskLevel.toLowerCase().includes(query) ?? false);
            }

            // 2. Country Filter
            const matchesCountry = countryFilter === 'all' || alert.satellite.OWNER === countryFilter;
            
            // 3. Type Filter
            const matchesType = typeFilter === 'all' || alert.satellite.OBJECT_TYPE === typeFilter;

            return matchesSearch && matchesCountry && matchesType;
        });
    }, [alerts, debouncedSearchQuery, countryFilter, typeFilter, isSystemReady]);
    
    if (selectedAlert) {
        return (
             <div className="w-[600px] bg-gray-900/90 backdrop-blur-sm flex flex-col border-l border-gray-700/50 shadow-2xl h-full">
                <AnomalyDetailView 
                    alert={selectedAlert}
                    onBack={() => onSelectSatellite(null)}
                    onArchive={() => onArchiveAlert(selectedAlert.satellite.NORAD_CAT_ID)}
                    onSaveNotes={onSaveNotes}
                />
             </div>
        )
    }

    return (
        <div className="w-[600px] bg-gray-900/90 backdrop-blur-sm flex flex-col border-l border-gray-700/50 shadow-2xl h-full">
            <div className="p-4 bg-gray-950/50 border-b border-gray-700/50">
                <div className="flex justify-between items-center">
                     <h2 className="text-xl font-bold tracking-wider text-gray-100">Anomaly Feed</h2>
                     <div className="flex items-center space-x-2">
                         <button 
                            onClick={onOpenArchive}
                            title="View Archived Analyses"
                            className="p-2 text-gray-400 hover:text-cyan-400 transition-colors rounded-md hover:bg-gray-800"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                        </button>
                     </div>
                </div>
            </div>

            <div className="p-4 border-b border-gray-700/50 space-y-4">
                 <RiskDistributionChart alerts={alerts} />
                 
                 <div className="flex space-x-2">
                     <FilterControl label="Country of Origin" value={countryFilter} onChange={setCountryFilter} options={filterOptions.countries} disabled={!isSystemReady} />
                     <FilterControl label="Object Type" value={typeFilter} onChange={setTypeFilter} options={filterOptions.types} disabled={!isSystemReady} />
                 </div>
                 <div className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={isSystemReady ? "Search name, NORAD ID, risk..." : "System initializing..."}
                        disabled={!isSystemReady}
                        className="w-full p-2 pl-8 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:bg-gray-800/50 disabled:placeholder:text-gray-600"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2.5 top-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                 </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {!isSystemReady && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        <p className="mt-2 font-semibold">Waiting for Live Data</p>
                        <p className="text-sm">System is initializing satellite catalog...</p>
                    </div>
                )}
                {isSystemReady && alerts.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
                         <svg className="animate-spin h-8 w-8 text-cyan-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-2 font-semibold">Scanning Orbital Sectors...</p>
                        <p className="text-sm">AI is analyzing telemetry streams.</p>
                    </div>
                )}
                {debouncedSearchQuery && filteredAlerts.length === 0 && isSystemReady && (
                     <div className="flex items-center justify-center h-full text-gray-500 text-center">
                        <p>No matching alerts found for your search.</p>
                    </div>
                )}
                {filteredAlerts.map((alert) => (
                    <AnomalyItem 
                        key={`${alert.satellite.NORAD_CAT_ID}-${alert.timestamp}`}
                        alert={alert}
                        isSelected={alert.satellite.NORAD_CAT_ID === selectedSatelliteId}
                        onSelect={() => onSelectSatellite(alert.satellite.NORAD_CAT_ID)}
                    />
                ))}
            </div>
             <div className="p-2 text-center text-xs text-gray-600 font-mono border-t border-gray-700/50">
                Session data is not persisted.
            </div>
        </div>
    );
};
