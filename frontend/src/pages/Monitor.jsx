import React from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';

export default function Monitor() {
  const { data: sessions, loading: loadingSessions, reload: reloadSessions } = useApi(() => api.getActiveSessions());
  const { data: logs, loading: loadingLogs } = useApi(() => api.getHeatingLog(50));

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
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Heating Log */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Heizungs-Protokoll</h2>
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
                    <tr key={log.id || i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('de-DE', {
                          day: '2-digit', month: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="p-3 font-medium text-gray-900">
                        {log.resource_id}
                      </td>
                      <td className="p-3">
                        <span className={`badge ${
                          log.action === 'heating' ? 'badge-yellow' :
                          log.action === 'idle' ? 'badge-gray' :
                          'badge-red'
                        }`}>
                          {log.action === 'heating' ? 'Heizend' :
                           log.action === 'idle' ? 'Leerlauf' :
                           'Fehler'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-700">
                        {log.temperature ? `${log.temperature}°C` : '--'}
                      </td>
                      <td className="p-3 text-gray-500 max-w-xs truncate">
                        {log.reason || '--'}
                      </td>
                      <td className="p-3">
                        {log.success ? (
                          <span className="text-green-600">OK</span>
                        ) : (
                          <span className="text-red-600" title={log.error_message}>Fehler</span>
                        )}
                      </td>
                    </tr>
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

function SessionCard({ session }) {
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
              Ressource {session.resource_id}
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
