import React, { useRef } from 'react';
import { AnomalyAlert } from '../types';
import { getRiskColor } from '../constants';

interface ArchiveModalProps {
    isOpen: boolean;
    onClose: () => void;
    archivedAlerts: AnomalyAlert[];
    onLoadArchives: (files: FileList) => void;
    onClearArchives: () => void;
}

const ArchivedAlertItem: React.FC<{ alert: AnomalyAlert }> = ({ alert }) => {
    const riskColor = getRiskColor(alert.details?.riskLevel);
    return (
        <details className={`p-3 rounded-md border-l-4 ${riskColor} bg-gray-800/60 overflow-hidden`}>
            <summary className="flex justify-between items-start cursor-pointer">
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-base text-gray-100 truncate">{alert.satellite.OBJECT_NAME}</p>
                    <p className="text-xs text-gray-400 font-mono">NORAD ID: {alert.satellite.NORAD_CAT_ID}</p>
                </div>
                {alert.details && (
                    <div className={`ml-2 text-right text-sm font-bold ${riskColor.replace('border', 'text')}`}>{alert.details.riskLevel}</div>
                )}
            </summary>
            <div className="mt-4 pt-3 border-t border-gray-700/50 space-y-3 text-sm">
                {alert.details ? (
                    <>
                        <p><strong className="text-gray-400">Anomaly:</strong> {alert.details.description}</p>
                        <p><strong className="text-gray-400">Assessment:</strong> {alert.details.assessment}</p>
                         {alert.details.operatorNotes && (
                            <p className="pt-2 mt-2 border-t border-gray-700"><strong className="text-cyan-300">Operator Notes:</strong> {alert.details.operatorNotes}</p>
                        )}
                    </>
                ) : (
                    <p className="text-gray-500">No AI analysis was saved for this alert.</p>
                )}
            </div>
        </details>
    );
};

export const ArchiveModal: React.FC<ArchiveModalProps> = ({ 
    isOpen, 
    onClose, 
    archivedAlerts, 
    onLoadArchives,
    onClearArchives
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) {
        return null;
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            onLoadArchives(event.target.files);
            event.target.value = '';
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 w-full max-w-2xl h-[80vh] rounded-lg shadow-2xl border border-gray-700 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-4 flex justify-between items-center border-b border-gray-700">
                    <h2 className="text-lg font-bold text-gray-200">Archived Assessments</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 space-y-3">
                    {archivedAlerts.length === 0 ? (
                        <div className="text-center text-gray-500 pt-10">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            <p className="mt-2 font-semibold">No archives loaded.</p>
                            <p className="text-sm">Click "Load Archives" to view saved assessment files.</p>
                        </div>
                    ) : (
                        archivedAlerts.map(alert => <ArchivedAlertItem key={alert.satellite.NORAD_CAT_ID} alert={alert} />)
                    )}
                </main>

                <footer className="p-4 border-t border-gray-700 flex items-center justify-between bg-gray-950/50">
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple
                        accept=".json"
                        className="hidden"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-md transition-colors"
                    >
                        Load Archives
                    </button>
                    {archivedAlerts.length > 0 && (
                        <button
                            onClick={onClearArchives}
                            className="px-4 py-2 bg-rose-800 hover:bg-rose-700 text-white text-sm font-semibold rounded-md transition-colors"
                        >
                            Clear History
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
};