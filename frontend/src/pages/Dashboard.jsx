import React from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import TemperatureGauge from '../components/TemperatureGauge';
import StatusBadge from '../components/StatusBadge';

export default function Dashboard() {
  const { data: mappings, loading: loadingMappings } = useApi(() => api.getMappings());
  const { data: scheduler, loading: loadingSched, reload: reloadSched } = useApi(() => api.getSchedulerStatus());
  const { data: alerts } = useApi(() => api.getActiveAlerts());
  const { data: sessions } = useApi(() => api.getActiveSessions());
  const { data: weather } = useApi(() => api.getWeather());

  // Create a map of resourceId -> resourceName from mappings
  const resourceNames = React.useMemo(() => {
    const map = {};
    (mappings || []).forEach(m => {
      map[m.resourceId] = m.resourceName;
    });
    return map;
  }, [mappings]);

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
  const activeAlerts = alerts || [];
  const activeSessions = sessions || [];

  return (
    <div className="space-y-8">
      {/* Alert banner */}
      {activeAlerts.length > 0 && (
        <div className="card border-yellow-300 bg-yellow-50">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-yellow-800">
                {activeAlerts.length} aktive{activeAlerts.length === 1 ? ' Warnung' : ' Warnungen'}
              </p>
              <p className="text-sm text-yellow-700 mt-0.5">
                {activeAlerts[0]?.message}
                {activeAlerts.length > 1 && ` (+${activeAlerts.length - 1} weitere)`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
        <StatCard
          label="Warnungen"
          value={activeAlerts.length}
          color={activeAlerts.length > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Outdoor Temperature */}
      {weather?.enabled && weather?.current && (
        <div className="card bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-sky-700">Außentemperatur</p>
                <p className="text-2xl font-bold text-sky-900">{weather.current.temperature}°C</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-sky-600">Schwelle: {weather.threshold}°C</p>
              <p className={`text-sm font-medium ${weather.current.temperature >= weather.threshold ? 'text-green-600' : 'text-sky-700'}`}>
                {weather.current.temperature >= weather.threshold ? 'Heizung pausiert' : 'Heizung aktiv'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Aktive Heizsitzungen</h2>
          <div className="space-y-2">
            {activeSessions.map(s => {
              const duration = s.current_duration_minutes || 0;
              const h = Math.floor(duration / 60);
              const m = duration % 60;
              const isOverlong = duration > 180;
              return (
                <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg ${isOverlong ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 border border-gray-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${isOverlong ? 'bg-yellow-400 animate-pulse' : 'bg-orange-400'}`} />
                    <span className="text-sm font-medium text-gray-900">
                      {resourceNames[s.resource_id] || `Ressource ${s.resource_id}`}
                      {s.booking_caption && <span className="text-gray-500 font-normal"> - {s.booking_caption}</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {h > 0 ? `${h}h ${m}m` : `${m}m`}
                    </span>
                    {isOverlong && <span className="badge badge-yellow">Überlang</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
    red: 'bg-red-50 text-red-700',
    green: 'bg-green-50 text-green-700',
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
