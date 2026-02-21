import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Resources from './pages/Resources';
import Mappings from './pages/Mappings';
import Bookings from './pages/Bookings';
import Battery from './pages/Battery';
import Alerts from './pages/Alerts';
import Monitor from './pages/Monitor';
import Settings from './pages/Settings';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'mappings', label: 'Zuordnung' },
  { id: 'battery', label: 'Batterie' },
  { id: 'monitor', label: 'Monitor' },
  { id: 'alerts', label: 'Warnungen' },
  { id: 'bookings', label: 'Buchungen' },
  { id: 'resources', label: 'Ressourcen' },
  { id: 'settings', label: 'Einstellungen' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                </svg>
              </div>
              <h1 className="text-lg font-semibold text-gray-900">Heizungssteuerung</h1>
            </div>
          </div>

          {/* Tabs */}
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'mappings' && <Mappings />}
        {activeTab === 'battery' && <Battery />}
        {activeTab === 'monitor' && <Monitor />}
        {activeTab === 'alerts' && <Alerts />}
        {activeTab === 'bookings' && <Bookings />}
        {activeTab === 'resources' && <Resources />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  );
}
