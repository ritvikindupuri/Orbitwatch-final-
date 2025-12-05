
import React from 'react';
import { APP_NAME } from '../constants';

interface SidebarProps {
    activeView: 'dashboard' | 'threats' | 'debris' | 'settings';
    onNavigate: (view: 'dashboard' | 'threats' | 'debris' | 'settings') => void;
    onClearSession: () => void;
    isDemoMode: boolean;
}

const NavItem: React.FC<{ 
    active: boolean; 
    onClick: () => void; 
    icon: React.ReactNode; 
    label: string; 
}> = ({ active, onClick, icon, label }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center space-x-3 px-4 py-3 transition-all duration-200 border-l-4 
        ${active 
            ? 'border-cyan-500 bg-gray-800/80 text-cyan-400' 
            : 'border-transparent text-gray-400 hover:text-gray-100 hover:bg-gray-800/40'}`}
    >
        {icon}
        <span className="font-semibold text-sm tracking-wide">{label}</span>
    </button>
);

const Logo: React.FC = () => (
    <svg 
        className="w-10 h-10" 
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

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, onClearSession, isDemoMode }) => {
    return (
        <aside className="w-64 h-full bg-gray-950 border-r border-gray-800 flex flex-col shadow-2xl z-50">
            {/* Header Area */}
            <div className="p-6 flex flex-col items-start border-b border-gray-800/50">
                <div className="flex items-center space-x-3 mb-2">
                    <Logo />
                    <div>
                        <h1 className="text-xl font-bold text-gray-100 tracking-wider uppercase">{APP_NAME}</h1>
                        <span className="text-[10px] text-cyan-500 font-mono block">SDA PLATFORM V1.0</span>
                    </div>
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
                <div className="px-4 mb-2 text-xs font-bold text-gray-600 uppercase tracking-widest font-mono">
                    Mission Control
                </div>
                
                <NavItem 
                    active={activeView === 'dashboard'} 
                    onClick={() => onNavigate('dashboard')}
                    label="Home"
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    }
                />
                
                <div className="px-4 mt-6 mb-2 text-xs font-bold text-gray-600 uppercase tracking-widest font-mono">
                    Services
                </div>

                <NavItem 
                    active={activeView === 'threats'} 
                    onClick={() => onNavigate('threats')}
                    label="Threat Detections"
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    }
                />
                 <NavItem 
                    active={activeView === 'debris'} 
                    onClick={() => onNavigate('debris')}
                    label="Debris Mitigation"
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                    }
                />

                 {/* Spacer */}
                 <div className="flex-1"></div>
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-800 bg-gray-900/50">
                <NavItem 
                    active={activeView === 'settings'} 
                    onClick={() => onNavigate('settings')}
                    label="Settings"
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    }
                />
                
                <button 
                    onClick={onClearSession}
                    className="w-full mt-4 flex items-center justify-center space-x-2 px-4 py-2 text-xs font-bold text-rose-300 bg-rose-950/30 border border-rose-900 rounded hover:bg-rose-900/50 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>CLEAR SESSION</span>
                </button>
            </div>
        </aside>
    );
};
