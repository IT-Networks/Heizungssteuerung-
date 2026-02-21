import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import TemperatureSlider from '../components/TemperatureSlider';

export default function Mappings() {
  const { data: mappings, loading: loadingMap, reload: reloadMap } = useApi(() => api.getMappings());
  const { data: resources, loading: loadingRes } = useApi(() => api.getResources());
  const { data: devices, loading: loadingDev } = useApi(() => api.getDevices());

  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const loading = loadingMap || loadingRes || loadingDev;

  const handleSave = async (mapping) => {
    setSaving(true);
    try {
      await api.saveMapping(mapping);
      setEditing(null);
      reloadMap();
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (resourceId) => {
    if (!confirm('Zuordnung wirklich löschen?')) return;
    try {
      await api.deleteMapping(resourceId);
      reloadMap();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Zuordnungen</h2>
          <p className="text-sm text-gray-500 mt-1">
            Verknüpfe ChurchTools-Ressourcen mit Danfoss-Thermostaten.
          </p>
        </div>
        <button
          onClick={() => setEditing({
            resourceId: '',
            resourceName: '',
            deviceId: '',
            deviceName: '',
            targetTemperature: 21,
            idleTemperature: 16,
            preheatMinutes: 30,
            enabled: true,
          })}
          className="btn-primary text-sm"
        >
          + Neue Zuordnung
        </button>
      </div>

      {/* Editing form */}
      {editing && (
        <MappingForm
          mapping={editing}
          resources={resources || []}
          devices={devices || []}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}

      {/* Existing mappings */}
      {(!mappings || mappings.length === 0) && !editing ? (
        <div className="card">
          <p className="text-gray-500">Noch keine Zuordnungen erstellt.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(mappings || []).map(mapping => (
            <div key={mapping.resourceId} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${mapping.enabled ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <div>
                    <p className="font-medium text-gray-900">{mapping.resourceName}</p>
                    <p className="text-sm text-gray-500">{mapping.deviceName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing({ ...mapping })}
                    className="btn-secondary text-xs px-3 py-1"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(mapping.resourceId)}
                    className="btn-danger text-xs px-3 py-1"
                  >
                    Löschen
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">Zieltemperatur</p>
                  <p className="text-lg font-semibold text-orange-600">{mapping.targetTemperature}°C</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Leerlauftemperatur</p>
                  <p className="text-lg font-semibold text-blue-600">{mapping.idleTemperature}°C</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vorlauf</p>
                  <p className="text-lg font-semibold text-gray-700">{mapping.preheatMinutes} Min.</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MappingForm({ mapping, resources, devices, onSave, onCancel, saving }) {
  const [form, setForm] = useState(mapping);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleResourceChange = (e) => {
    const id = Number(e.target.value);
    const res = resources.find(r => r.id === id);
    update('resourceId', id);
    update('resourceName', res?.name || '');
  };

  const handleDeviceChange = (e) => {
    const id = e.target.value;
    const dev = devices.find(d => (d.id || d.device_id) === id);
    update('deviceId', id);
    update('deviceName', dev?.name || dev?.device_name || '');
  };

  return (
    <div className="card border-brand-200 bg-brand-50/30">
      <h3 className="font-semibold text-gray-900 mb-4">
        {mapping.resourceId ? 'Zuordnung bearbeiten' : 'Neue Zuordnung'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ressource</label>
          <select
            value={form.resourceId}
            onChange={handleResourceChange}
            className="input"
          >
            <option value="">Ressource wählen...</option>
            {resources.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Thermostat</label>
          <select
            value={form.deviceId}
            onChange={handleDeviceChange}
            className="input"
          >
            <option value="">Thermostat wählen...</option>
            {devices.map(d => (
              <option key={d.id || d.device_id} value={d.id || d.device_id}>
                {d.name || d.device_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Zieltemperatur: {form.targetTemperature}°C
          </label>
          <TemperatureSlider
            value={form.targetTemperature}
            onChange={v => update('targetTemperature', v)}
            min={15}
            max={30}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Leerlauftemperatur: {form.idleTemperature}°C
          </label>
          <TemperatureSlider
            value={form.idleTemperature}
            onChange={v => update('idleTemperature', v)}
            min={5}
            max={20}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vorlaufzeit (Minuten)
          </label>
          <input
            type="number"
            value={form.preheatMinutes}
            onChange={e => update('preheatMinutes', parseInt(e.target.value) || 0)}
            min={0}
            max={120}
            className="input"
          />
        </div>

        <div className="flex items-center gap-3 pt-6">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e => update('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
            <span className="ml-3 text-sm font-medium text-gray-700">Aktiv</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <button onClick={onCancel} className="btn-secondary text-sm">Abbrechen</button>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.resourceId || !form.deviceId}
          className="btn-primary text-sm"
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}
