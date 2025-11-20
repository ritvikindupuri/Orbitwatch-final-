import React, { useState } from 'react';
import { APP_NAME } from '../constants';

interface SpaceTrackLoginProps {
    onLogin: (identity: string, password: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

export const SpaceTrackLogin: React.FC<SpaceTrackLoginProps> = ({ onLogin, isLoading, error }) => {
    const [identity, setIdentity] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (identity && password) {
            onLogin(identity, password);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
            <div className="absolute inset-0 bg-cyan-900/10 backdrop-blur-[2px]"></div>
            
            <div className="relative w-full max-w-md bg-gray-900/90 border border-gray-700 rounded-xl shadow-2xl p-8 backdrop-blur-md">
                <div className="text-center mb-8">
                     <svg 
                        className="w-20 h-20 mx-auto mb-4" 
                        viewBox="0 0 100 100" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M10 50C22.5 25, 77.5 25, 90 50C77.5 75, 22.5 75, 10 50Z" stroke="#67e8f9" strokeWidth="4"/>
                        <circle cx="50" cy="50" r="18" stroke="#22d3ee" strokeWidth="3"/>
                        <ellipse cx="50" cy="50" rx="28" ry="10" stroke="#06b6d4" strokeWidth="2.5"/>
                    </svg>
                    <h1 className="text-3xl font-bold text-gray-100 tracking-wider">{APP_NAME}</h1>
                    <p className="text-cyan-400 font-mono text-sm mt-2">Space Domain Awareness Platform</p>
                </div>

                <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <p className="text-sm text-gray-300 text-center leading-relaxed">
                        Please authenticate with your <strong className="text-white">Space-Track.org</strong> credentials to ingest live TLE data for GEO/LEO training sets.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Identity / Email</label>
                        <input
                            type="text"
                            value={identity}
                            onChange={(e) => setIdentity(e.target.value)}
                            className="w-full p-3 bg-gray-800 text-white border border-gray-600 rounded-md focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-gray-600"
                            placeholder="user@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 bg-gray-800 text-white border border-gray-600 rounded-md focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder-gray-600"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-900/30 border border-rose-800 rounded text-rose-300 text-xs">
                            ⚠ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 mt-4 rounded-md font-bold text-white uppercase tracking-wider transition-all
                            ${isLoading 
                                ? 'bg-gray-700 cursor-wait' 
                                : 'bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.5)]'
                            }`}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Authenticating & Fetching...
                            </span>
                        ) : (
                            "Initialize System"
                        )}
                    </button>
                </form>
                
                <p className="mt-6 text-xs text-gray-600 text-center">
                    Note: Credentials are processed locally and sent directly to Space-Track API via https.
                </p>
            </div>
        </div>
    );
};