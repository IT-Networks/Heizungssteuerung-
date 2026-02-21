import React, { useState } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';

export default function Alerts() {
  const [showAll, setShowAll] = useState(false);
  const { data: alerts, loading, reload } = useApi(
    () => showAll ? api.getAlerts(false) : api.getActiveAlerts(),
    [showAll]
  );

  const handleAcknowledge = async (id) => {
    try {
      await api.acknowledgeAlert(id);
      reload();
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      await api.acknowledgeAllAlerts();
      reload();
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  const list = alerts || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Warnungen & Alarme</h2>
          <p className="text-sm text-gray-500 mt-1">
            Batterie-Warnungen und Überwachungsmeldungen.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showAll}
              onChange={e => setShowAll(e.target.checked)}
              className="rounded border-gray-300"
            />
            Alle anzeigen
          </label>
          {list.some(a => !a.acknowledged) && (
            <button onClick={handleAcknowledgeAll} className="btn-secondary text-sm">
              Alle bestätigen
            </button>
          )}
          <button onClick={reload} className="btn-secondary text-sm">
            Aktualisieren
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card">
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-gray-500">Keine {showAll ? '' : 'aktiven '}Warnungen.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert, onAcknowledge }) {
  const severityConfig = {
    critical: {
      border: 'border-red-200',
      bg: 'bg-red-50',
      icon: 'text-red-500',
      badge: 'badge-red',
      label: 'Kritisch',
    },
    warning: {
      border: 'border-yellow-200',
      bg: 'bg-yellow-50',
      icon: 'text-yellow-500',
      badge: 'badge-yellow',
      label: 'Warnung',
    },
    info: {
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      icon: 'text-blue-500',
      badge: 'badge-blue',
      label: 'Info',
    },
  };

  const config = severityConfig[alert.severity] || severityConfig.warning;

  const typeLabels = {
    battery_critical: 'Batterie kritisch',
    battery_warning: 'Batterie niedrig',
    extended_heating: 'Langes Heizen',
  };

  return (
    <div className={`card ${config.border} ${alert.acknowledged ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 ${config.icon}`}>
            {alert.severity === 'critical' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{alert.message}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge ${config.badge}`}>{config.label}</span>
              <span className="badge badge-gray">{typeLabels[alert.type] || alert.type}</span>
              <span className="text-xs text-gray-400">
                {new Date(alert.created_at).toLocaleString('de-DE')}
              </span>
            </div>
          </div>
        </div>
        {!alert.acknowledged && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="btn-secondary text-xs px-2 py-1 flex-shrink-0"
          >
            Bestätigen
          </button>
        )}
      </div>
    </div>
  );
}
