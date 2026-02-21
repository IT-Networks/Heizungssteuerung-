import React from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import TemperatureGauge from '../components/TemperatureGauge';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const { data: mappings, loading: loadingMappings } = useApi(() => api.getMappings());
  const { data: scheduler, loading: loadingSched, reload: reloadSched } = useApi(() => api.getSchedulerStatus());

  const handleManualRun = async () => {
    try {
      await api.runScheduler();
      reloadSched();
    } catch (err) {
      alert('Scheduler-Fehler: ' + err.message);
    }
  };

  if (loadingMappings || loadingSched) {
    return <LoadingSpinner />;
  }

  const enabledMappings = (mappings || []).filter(m => m.enabled);
  const results = scheduler?.results || [];

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Aktive Zuordnungen"
          value={enabledMappings.length}
          color="blue"
        />
        <StatCard
          label="Heizend"
          value={results.filter(r => r.action === 'heating').length}
          color="orange"
        />
        <StatCard
          label="Im Leerlauf"
          value={results.filter(r => r.action === 'idle').length}
          color="gray"
        />
      </div>

      {/* Scheduler Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Scheduler-Status</h2>
            {scheduler?.lastRun && (
              <p className="text-sm text-gray-500 mt-1">
                Letzter Lauf: {new Date(scheduler.lastRun).toLocaleString('de-DE')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge active={scheduler?.running} />
            <button onClick={handleManualRun} className="btn-secondary text-sm">
              Jetzt ausführen
            </button>
          </div>
        </div>

        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-4">
                  <TemperatureGauge temperature={r.temperature} size="sm" />
                  <div>
                    <p className="font-medium text-gray-900">{r.resourceName}</p>
                    <p className="text-sm text-gray-500">{r.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${r.action === 'heating' ? 'badge-yellow' : 'badge-gray'}`}>
                    {r.action === 'heating' ? 'Heizend' : 'Leerlauf'}
                  </span>
                  {r.success === false && (
                    <span className="badge badge-red">Fehler</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">
            Keine Ergebnisse. Erstelle Zuordnungen unter "Zuordnung" um die automatische Steuerung zu aktivieren.
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    orange: 'bg-orange-50 text-orange-700',
    gray: 'bg-gray-50 text-gray-700',
  };

  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${colorClasses[color] ? 'text-' + color + '-700' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
    </div>
  );
}
