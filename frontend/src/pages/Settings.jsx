import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';

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
