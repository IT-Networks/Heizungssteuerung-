import React, { useMemo } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';

export default function Monitor() {
  const { data: sessions, loading: loadingSessions, reload: reloadSessions } = useApi(() => api.getActiveSessions());
  const { data: logs, loading: loadingLogs, reload: reloadLogs } = useApi(() => api.getHeatingLog(100));
  const { data: mappings } = useApi(() => api.getMappings());

  // Create resource name lookup from mappings
  const resourceNames = useMemo(() => {
    if (!mappings) return {};
    const names = {};
    for (const m of mappings) {
      names[m.resourceId] = m.resourceName;
    }
    return names;
  }, [mappings]);

  const getResourceName = (resourceId) => resourceNames[resourceId] || `Ressource ${resourceId}`;

  if (loadingSessions || loadingLogs) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Active Heating Sessions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Aktive Heizsitzungen</h2>
            <p className="text-sm text-gray-500 mt-1">
              Aktuell laufende Heizungen mit Dauer-Tracking.
            </p>
          </div>
          <button onClick={reloadSessions} className="btn-secondary text-sm">
            Aktualisieren
          </button>
        </div>

        {(!sessions || sessions.length === 0) ? (
          <div className="card">
            <p className="text-gray-500 text-sm">Keine aktiven Heizsitzungen.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => (
              <SessionCard key={session.id} session={session} resourceName={getResourceName(session.resource_id)} />
            ))}
          </div>
        )}
      </div>

      {/* Heating Log */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Heizungs-Protokoll</h2>
            <p className="text-sm text-gray-500 mt-1">
              Protokoll aller Heizungsaktionen (Hochfahren/Herunterfahren).
            </p>
          </div>
          <button onClick={reloadLogs} className="btn-secondary text-sm">
            Aktualisieren
          </button>
        </div>

        {(!logs || logs.length === 0) ? (
          <div className="card">
            <p className="text-gray-500 text-sm">Noch keine Protokolleinträge.</p>
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-500">Zeit</th>
                    <th className="text-left p-3 font-medium text-gray-500">Ressource</th>
                    <th className="text-left p-3 font-medium text-gray-500">Aktion</th>
                    <th className="text-left p-3 font-medium text-gray-500">Temp.</th>
                    <th className="text-left p-3 font-medium text-gray-500">Grund</th>
                    <th className="text-left p-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <LogRow key={log.id || i} log={log} resourceName={getResourceName(log.resource_id)} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogRow({ log, resourceName }) {
  const isHeating = log.action === 'heating';
  const isIdle = log.action === 'idle';
  const isError = log.action === 'error' || !log.success;

  return (
    <tr className={`border-b border-gray-50 hover:bg-gray-50 ${isHeating ? 'bg-orange-50/30' : ''}`}>
      <td className="p-3 text-gray-500 whitespace-nowrap">
        {new Date(log.created_at).toLocaleString('de-DE', {
          day: '2-digit', month: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })}
      </td>
      <td className="p-3 font-medium text-gray-900">
        {resourceName}
      </td>
      <td className="p-3">
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
          isHeating ? 'bg-orange-100 text-orange-700' :
          isIdle ? 'bg-blue-100 text-blue-700' :
          'bg-red-100 text-red-700'
        }`}>
          {isHeating ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
              </svg>
              Hochfahren
            </>
          ) : isIdle ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
              </svg>
              Herunterfahren
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              Fehler
            </>
          )}
        </span>
      </td>
      <td className="p-3 text-gray-700 font-medium">
        {log.temperature ? `${log.temperature}°C` : '--'}
      </td>
      <td className="p-3 text-gray-500 max-w-xs">
        <span className="line-clamp-2">{log.reason || '--'}</span>
      </td>
      <td className="p-3">
        {log.success ? (
          <span className="inline-flex items-center gap-1 text-green-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            OK
          </span>
        ) : (
          <span className="text-red-600" title={log.error_message}>
            <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Fehler
          </span>
        )}
      </td>
    </tr>
  );
}

function SessionCard({ session, resourceName }) {
  const duration = session.current_duration_minutes || 0;
  const isOverlong = duration > 180;

  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h} Std. ${m} Min.`;
    return `${m} Min.`;
  };

  return (
    <div className={`card ${isOverlong ? 'border-yellow-300 bg-yellow-50/50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isOverlong ? 'bg-yellow-400 animate-pulse' : 'bg-orange-400'}`} />
          <div>
            <p className="font-medium text-gray-900">
              {resourceName}
              {session.booking_caption && (
                <span className="text-gray-500 font-normal"> - {session.booking_caption}</span>
              )}
            </p>
            <p className="text-sm text-gray-500">
              Start: {new Date(session.started_at).toLocaleString('de-DE')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${isOverlong ? 'text-yellow-600' : 'text-orange-600'}`}>
            {formatDuration(duration)}
          </p>
          {session.target_temperature && (
            <p className="text-sm text-gray-500">{session.target_temperature}°C</p>
          )}
          {isOverlong && (
            <span className="badge badge-yellow mt-1">Überlang</span>
          )}
        </div>
      </div>
    </div>
  );
}
