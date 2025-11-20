import React from 'react';
import { APP_NAME } from '../constants';

const AppLogo: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        className={className} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M10 50C22.5 25, 77.5 25, 90 50C77.5 75, 22.5 75, 10 50Z" stroke="#67e8f9" strokeWidth="4"/>
        <circle cx="50" cy="50" r="18" stroke="#22d3ee" strokeWidth="3"/>
        <ellipse cx="50" cy="50" rx="28" ry="10" stroke="#06b6d4" strokeWidth="2.5"/>
        <circle cx="70" cy="44" r="3" fill="#f0f9ff"/>
    </svg>
);


export const Header: React.FC<{ onClearSession: () => void; isDemoMode: boolean; }> = ({ onClearSession, isDemoMode }) => {
  return (
    <header className="flex items-center justify-between p-3 bg-gray-950/70 backdrop-blur-sm border-b border-gray-700/50 z-20 shadow-lg">
      <div className="flex items-center">
        <AppLogo className="h-10 w-10 mr-3" />
        <div>
            <h1 className="text-lg font-bold tracking-wider text-gray-100">{APP_NAME}</h1>
            <p className="text-xs text-cyan-400 -mt-1 font-mono">Real-Time Anomaly Detection</p>
        </div>
        {isDemoMode && (
          <span className="ml-4 px-2 py-0.5 text-xs font-semibold text-amber-300 bg-amber-900/50 border border-amber-700 rounded-full">
            Demonstration Mode
          </span>
        )}
      </div>
      <button 
        onClick={onClearSession}
        title="Clear all session data"
        className="px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-900/50 border border-rose-700 rounded-md hover:bg-rose-800/70 hover:text-rose-200 transition-colors"
       >
        Clear Session
      </button>
    </header>
  );
};