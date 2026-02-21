import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

export default function Bookings() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const [from, setFrom] = useState(formatDate(today));
  const [to, setTo] = useState(formatDate(nextWeek));

  // First fetch resources to get their IDs
  const { data: resources } = useApi(() => api.getResources(), []);

  // Then fetch bookings for all resources
  const resourceIds = useMemo(() => (resources || []).map(r => r.id), [resources]);

  const { data: bookings, loading, error, reload } = useApi(
    () => resourceIds.length > 0
      ? api.getBookings({ from, to, resource_ids: resourceIds })
      : Promise.resolve([]),
    [from, to, resourceIds.join(',')]
  );

  const grouped = useMemo(() => {
    if (!bookings) return {};
    const groups = {};
    for (const item of bookings) {
      // Handle nested structure: item.booking.calculated.startDate or item.calculated.startDate
      const booking = item.booking || item;
      const startDate = booking.calculated?.startDate || booking.base?.startDate || booking.startDate || '';
      const date = startDate.split('T')[0] || 'Unbekannt';
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    }
    return groups;
  }, [bookings]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Buchungen</h2>
          <p className="text-sm text-gray-500 mt-1">Raumbuchungen aus ChurchTools.</p>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Von</label>
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bis</label>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="input text-sm"
            />
          </div>
          <button onClick={reload} className="btn-secondary text-sm mt-5">
            Laden
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="card border-red-200 bg-red-50">
          <p className="text-red-700">Fehler: {error}</p>
        </div>
      )}

      {!loading && !error && bookings?.length === 0 && (
        <div className="card">
          <p className="text-gray-500">Keine Buchungen im gewählten Zeitraum.</p>
        </div>
      )}

      {!loading && Object.keys(grouped).sort().map(date => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {new Date(date + 'T00:00:00').toLocaleDateString('de-DE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <div className="space-y-2">
            {grouped[date].map((item, i) => {
              // Handle nested structure
              const booking = item.booking || item;
              const base = booking.base || booking;
              const calculated = booking.calculated || {};

              const start = new Date(calculated.startDate || base.startDate);
              const end = new Date(calculated.endDate || base.endDate);
              const resourceName = base.resource?.name || base.resourceName || 'Unbekannt';
              const caption = base.title || base.caption || 'Buchung';
              const status = base.statusId;

              return (
                <div key={base.id || i} className="card flex items-center gap-4">
                  <div className="flex-shrink-0 w-20 text-center">
                    <p className="text-sm font-semibold text-brand-600">
                      {start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-xs text-gray-400">bis</p>
                    <p className="text-sm font-semibold text-brand-600">
                      {end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{caption}</p>
                    <p className="text-sm text-gray-500">{resourceName}</p>
                  </div>
                  <div>
                    {status === 2 ? (
                      <span className="badge badge-green">Bestätigt</span>
                    ) : status === 1 ? (
                      <span className="badge badge-yellow">Angefragt</span>
                    ) : status === 99 ? (
                      <span className="badge badge-red">Abgelehnt</span>
                    ) : (
                      <span className="badge badge-gray">Status {status}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
