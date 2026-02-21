import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';

function WeatherPreview() {
  const { data: weather, loading } = useApi(() => api.getWeather(), []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-600 rounded-full animate-spin" />
        Lade Wetterdaten...
      </div>
    );
  }

  if (!weather?.current) {
    return (
      <div className="text-sm text-gray-500">
        Keine Wetterdaten verfügbar. Bitte Standort konfigurieren.
      </div>
    );
  }

  const isAboveThreshold = weather.current.temperature >= weather.threshold;

  return (
    <div className={`p-4 rounded-lg border ${isAboveThreshold ? 'bg-green-50 border-green-200' : 'bg-sky-50 border-sky-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isAboveThreshold ? 'bg-green-100' : 'bg-sky-100'}`}>
            <span className="text-xl font-bold ${isAboveThreshold ? 'text-green-700' : 'text-sky-700'}">
              {weather.current.temperature}°
            </span>
          </div>
          <div>
            <p className={`font-medium ${isAboveThreshold ? 'text-green-800' : 'text-sky-800'}`}>
              Aktuelle Außentemperatur
            </p>
            <p className={`text-sm ${isAboveThreshold ? 'text-green-600' : 'text-sky-600'}`}>
              Schwelle: {weather.threshold}°C
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${isAboveThreshold ? 'bg-green-200 text-green-800' : 'bg-sky-200 text-sky-800'}`}>
          {isAboveThreshold ? 'Heizung pausiert' : 'Heizung aktiv'}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { data: settings, loading, reload } = useApi(() => api.getSettings());
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveSettings(form);
      setSaved(true);
      reload();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Einstellungen</h2>
        <p className="text-sm text-gray-500 mt-1">
          Systemeinstellungen für Heizung, Batterie und Überwachung.
        </p>
      </div>

      {/* Vorlauf / Preheat settings */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Vorlauf-Einstellungen</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingField
            label="Standard-Vorlaufzeit (Minuten)"
            description="Wie viele Minuten vor einer Buchung die Heizung starten soll."
            value={form.preheat_default_minutes || '30'}
            onChange={v => update('preheat_default_minutes', v)}
            type="number"
            min={0}
            max={180}
          />
          <SettingField
            label="Scheduler-Intervall (Minuten)"
            description="Wie oft der Scheduler Buchungen prüft und Thermostate steuert."
            value={form.scheduler_interval_minutes || '5'}
            onChange={v => update('scheduler_interval_minutes', v)}
            type="number"
            min={1}
            max={60}
          />
          <SettingField
            label="Frostschutz-Temperatur (°C)"
            description="Minimale Temperatur zum Schutz vor Frostschäden."
            value={form.frost_protection_temperature || '5'}
            onChange={v => update('frost_protection_temperature', v)}
            type="number"
            min={0}
            max={10}
          />
        </div>
      </div>

      {/* Heating monitoring settings */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Heizungsüberwachung</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingField
            label="Maximale Heizdauer (Minuten)"
            description="Nach dieser Zeit wird eine Warnung ausgelöst. Schützt vor vergessenen Buchungen."
            value={form.max_heating_duration_minutes || '180'}
            onChange={v => update('max_heating_duration_minutes', v)}
            type="number"
            min={30}
            max={720}
          />
        </div>
      </div>

      {/* Battery settings */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Batterie-Überwachung</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SettingField
            label="Warnschwelle (%)"
            description="Bei diesem Batteriestand wird eine Warnung erstellt."
            value={form.battery_warning_threshold || '20'}
            onChange={v => update('battery_warning_threshold', v)}
            type="number"
            min={5}
            max={50}
          />
          <SettingField
            label="Kritischer Schwellwert (%)"
            description="Bei diesem Batteriestand wird ein kritischer Alarm ausgelöst."
            value={form.battery_critical_threshold || '10'}
            onChange={v => update('battery_critical_threshold', v)}
            type="number"
            min={1}
            max={30}
          />
        </div>
      </div>

      {/* Weather / Outdoor temperature settings */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Außentemperatur-Prüfung</h3>
        <p className="text-sm text-gray-500 mb-4">
          Wenn aktiviert, wird die Heizung nur eingeschaltet wenn die Außentemperatur unter dem Schwellwert liegt.
          Daten von Open-Meteo (kostenlos, keine API-Key erforderlich).
        </p>

        {/* Live temperature preview */}
        {form.weather_enabled === 'true' && form.weather_latitude && form.weather_longitude && (
          <div className="mb-6">
            <WeatherPreview />
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aktiviert</label>
            <label className="relative inline-flex items-center cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={form.weather_enabled === 'true'}
                onChange={e => update('weather_enabled', e.target.checked ? 'true' : 'false')}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
              <span className="ml-3 text-sm text-gray-600">
                {form.weather_enabled === 'true' ? 'Außentemperatur wird geprüft' : 'Deaktiviert'}
              </span>
            </label>
          </div>
          <SettingField
            label="Temperatur-Schwelle (°C)"
            description="Heizung wird nur aktiviert wenn Außentemperatur unter diesem Wert liegt."
            value={form.weather_threshold || '15'}
            onChange={v => update('weather_threshold', v)}
            type="number"
            min={-10}
            max={30}
          />
          <div className="md:col-span-2">
            <LocationSearch
              latitude={form.weather_latitude}
              longitude={form.weather_longitude}
              onSelect={(lat, lon) => {
                update('weather_latitude', lat);
                update('weather_longitude', lon);
              }}
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
        >
          {saving ? 'Speichern...' : 'Einstellungen speichern'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">
            Gespeichert!
          </span>
        )}
      </div>
    </div>
  );
}

function SettingField({ label, description, value, onChange, type = 'text', min, max }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {description && (
        <p className="text-xs text-gray-400 mb-2">{description}</p>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        min={min}
        max={max}
        className="input"
      />
    </div>
  );
}

function LocationSearch({ latitude, longitude, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (q) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const data = await api.searchLocation(q);
      setResults(data);
      setShowResults(true);
    } catch (err) {
      console.error('Location search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (loc) => {
    onSelect(String(loc.latitude), String(loc.longitude));
    setQuery(`${loc.name}, ${loc.admin1 || loc.country}`);
    setShowResults(false);
    setResults([]);
  };

  const hasLocation = latitude && longitude;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Standort</label>
        <p className="text-xs text-gray-400 mb-2">
          Suchen Sie nach Ihrer Stadt oder Gemeinde.
        </p>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="z.B. Wuppertal, Berlin, München..."
            className="input pr-10"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-600 rounded-full animate-spin" />
            </div>
          )}

          {/* Results dropdown */}
          {showResults && results.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
              {results.map((loc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                >
                  <span className="text-sm text-gray-900">
                    {loc.name}
                    {loc.admin1 && <span className="text-gray-500">, {loc.admin1}</span>}
                  </span>
                  <span className="text-xs text-gray-400">{loc.country}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {hasLocation && (
        <div className="flex items-center gap-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Standort gesetzt</p>
            <p className="text-xs text-green-600">
              {latitude}, {longitude}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
