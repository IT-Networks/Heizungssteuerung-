import React from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';

export default function Battery() {
  const { data: batteries, loading, error, reload } = useApi(() => api.getBatteryStatus());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-200 bg-red-50">
        <p className="text-red-700">Fehler: {error}</p>
      </div>
    );
  }

  const sorted = [...(batteries || [])].sort((a, b) => (a.batteryLevel ?? 999) - (b.batteryLevel ?? 999));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Batteriestatus</h2>
          <p className="text-sm text-gray-500 mt-1">
            Batteriestand aller Danfoss-Thermostate.
          </p>
        </div>
        <button onClick={reload} className="btn-secondary text-sm">
          Aktualisieren
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="card">
          <p className="text-gray-500">Keine Geräte gefunden.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(device => (
            <BatteryCard key={device.deviceId} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}

function BatteryCard({ device }) {
  const level = device.batteryLevel;
  const hasLevel = level !== null && level !== undefined;

  const getColor = (lvl) => {
    if (lvl <= 10) return { bg: 'bg-red-500', text: 'text-red-700', ring: 'ring-red-200', fill: 'bg-red-100' };
    if (lvl <= 20) return { bg: 'bg-orange-500', text: 'text-orange-700', ring: 'ring-orange-200', fill: 'bg-orange-100' };
    if (lvl <= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-700', ring: 'ring-yellow-200', fill: 'bg-yellow-100' };
    return { bg: 'bg-green-500', text: 'text-green-700', ring: 'ring-green-200', fill: 'bg-green-100' };
  };

  const colors = hasLevel ? getColor(level) : { bg: 'bg-gray-400', text: 'text-gray-500', ring: 'ring-gray-200', fill: 'bg-gray-100' };

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{device.deviceName}</h3>
          {device.mappedResource && (
            <p className="text-sm text-gray-500">{device.mappedResource}</p>
          )}
        </div>
        <span className={`badge ${device.online ? 'badge-green' : 'badge-red'}`}>
          {device.online ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Battery bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500">Batterie</span>
          <span className={`font-semibold ${colors.text}`}>
            {hasLevel ? `${level}%` : 'N/A'}
          </span>
        </div>
        <div className={`w-full h-3 rounded-full ${colors.fill} overflow-hidden`}>
          <div
            className={`h-full rounded-full ${colors.bg} transition-all duration-500`}
            style={{ width: `${hasLevel ? level : 0}%` }}
          />
        </div>
      </div>

      {/* Temperature info */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500">Ist-Temperatur</p>
          <p className="text-sm font-semibold text-gray-900">
            {device.currentTemperature !== null ? `${device.currentTemperature}°C` : '--'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Soll-Temperatur</p>
          <p className="text-sm font-semibold text-gray-900">
            {device.setTemperature !== null ? `${device.setTemperature}°C` : '--'}
          </p>
        </div>
      </div>
    </div>
  );
}
