import React, { useState, useMemo } from 'react';
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

  // Group mappings by resourceId
  const groupedMappings = useMemo(() => {
    if (!mappings) return [];
    const groups = {};
    for (const m of mappings) {
      if (!groups[m.resourceId]) {
        groups[m.resourceId] = {
          resourceId: m.resourceId,
          resourceName: m.resourceName,
          targetTemperature: m.targetTemperature,
          idleTemperature: m.idleTemperature,
          preheatMinutes: m.preheatMinutes,
          devices: [],
        };
      }
      groups[m.resourceId].devices.push(m);
    }
    return Object.values(groups).sort((a, b) => a.resourceName.localeCompare(b.resourceName));
  }, [mappings]);

  // Get devices already mapped
  const mappedDeviceIds = useMemo(() => {
    return new Set((mappings || []).map(m => m.deviceId));
  }, [mappings]);

  const handleSaveMultiple = async (resourceId, resourceName, deviceIds, settings) => {
    setSaving(true);
    try {
      // Save each device mapping
      for (const deviceId of deviceIds) {
        const dev = (devices || []).find(d => (d.id || d.device_id) === deviceId);
        await api.saveMapping({
          resourceId,
          resourceName,
          deviceId,
          deviceName: dev?.name || dev?.device_name || deviceId,
          ...settings,
        });
      }
      setEditing(null);
      reloadMap();
    } catch (err) {
      alert('Fehler: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDevice = async (id) => {
    if (!confirm('Thermostat-Zuordnung wirklich löschen?')) return;
    try {
      await api.deleteMapping(id);
      reloadMap();
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    const group = groupedMappings.find(g => g.resourceId === resourceId);
    if (!group) return;
    if (!confirm(`Alle ${group.devices.length} Thermostat-Zuordnungen für "${group.resourceName}" löschen?`)) return;
    try {
      for (const device of group.devices) {
        await api.deleteMapping(device.id);
      }
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
          onClick={() => setEditing({ isNew: true })}
          className="btn-primary text-sm"
        >
          + Neue Zuordnung
        </button>
      </div>

      {/* Editing form */}
      {editing && (
        <MappingForm
          editing={editing}
          resources={resources || []}
          devices={devices || []}
          mappedDeviceIds={mappedDeviceIds}
          existingMappings={mappings || []}
          onSave={handleSaveMultiple}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}

      {/* Grouped mappings by resource */}
      {groupedMappings.length === 0 && !editing ? (
        <div className="card">
          <p className="text-gray-500">Noch keine Zuordnungen erstellt.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedMappings.map(group => (
            <div key={group.resourceId} className="card">
              {/* Resource header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{group.resourceName}</h3>
                  <p className="text-sm text-gray-500">
                    {group.devices.length} Thermostat{group.devices.length !== 1 ? 'e' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing({
                      isNew: false,
                      resourceId: group.resourceId,
                      resourceName: group.resourceName,
                      existingDeviceIds: group.devices.map(d => d.deviceId),
                      targetTemperature: group.targetTemperature,
                      idleTemperature: group.idleTemperature,
                      preheatMinutes: group.preheatMinutes,
                    })}
                    className="btn-secondary text-xs px-3 py-1"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDeleteResource(group.resourceId)}
                    className="btn-danger text-xs px-3 py-1"
                  >
                    Alle löschen
                  </button>
                </div>
              </div>

              {/* Temperature settings */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Zieltemperatur</p>
                  <p className="text-lg font-semibold text-orange-600">{group.targetTemperature}°C</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Leerlauftemperatur</p>
                  <p className="text-lg font-semibold text-blue-600">{group.idleTemperature}°C</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vorlauf</p>
                  <p className="text-lg font-semibold text-gray-700">{group.preheatMinutes} Min.</p>
                </div>
              </div>

              {/* Device list */}
              <div className="space-y-2">
                {group.devices.map(device => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-gray-100 bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${device.enabled ? 'bg-green-400' : 'bg-gray-300'}`} />
                      <span className="text-sm text-gray-700">{device.deviceName}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteDevice(device.id)}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Entfernen"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MappingForm({ editing, resources, devices, mappedDeviceIds, existingMappings, onSave, onCancel, saving }) {
  const isNew = editing.isNew;

  const [resourceId, setResourceId] = useState(editing.resourceId || '');
  const [resourceName, setResourceName] = useState(editing.resourceName || '');
  const [selectedDevices, setSelectedDevices] = useState(new Set(editing.existingDeviceIds || []));
  const [targetTemperature, setTargetTemperature] = useState(editing.targetTemperature || 21);
  const [idleTemperature, setIdleTemperature] = useState(editing.idleTemperature || 16);
  const [preheatMinutes, setPreheatMinutes] = useState(editing.preheatMinutes || 30);

  const handleResourceChange = (e) => {
    const id = Number(e.target.value);
    const res = resources.find(r => r.id === id);
    setResourceId(id);
    setResourceName(res?.name || '');

    // Pre-select devices already mapped to this resource
    const existing = existingMappings.filter(m => m.resourceId === id);
    setSelectedDevices(new Set(existing.map(m => m.deviceId)));

    // Copy settings from existing mapping if any
    if (existing.length > 0) {
      setTargetTemperature(existing[0].targetTemperature);
      setIdleTemperature(existing[0].idleTemperature);
      setPreheatMinutes(existing[0].preheatMinutes);
    }
  };

  const toggleDevice = (deviceId) => {
    setSelectedDevices(prev => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const handleSave = () => {
    onSave(resourceId, resourceName, Array.from(selectedDevices), {
      targetTemperature,
      idleTemperature,
      preheatMinutes,
      enabled: true,
    });
  };

  // Filter to only show thermostats (devices with battery)
  const thermostats = devices.filter(d => {
    const status = d.status || [];
    return status.some(s => s.code === 'battery_percentage' || s.code === 'temp_set');
  });

  return (
    <div className="card border-brand-200 bg-brand-50/30">
      <h3 className="font-semibold text-gray-900 mb-4">
        {isNew ? 'Neue Zuordnung' : `${resourceName} bearbeiten`}
      </h3>

      <div className="space-y-6">
        {/* Resource selection (only for new) */}
        {isNew && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ressource</label>
            <select
              value={resourceId}
              onChange={handleResourceChange}
              className="input"
            >
              <option value="">Ressource wählen...</option>
              {resources.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Device multi-select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thermostate auswählen ({selectedDevices.size} ausgewählt)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
            {thermostats.map(d => {
              const id = d.id || d.device_id;
              const name = d.name || d.device_name;
              const isSelected = selectedDevices.has(id);
              const isMappedElsewhere = mappedDeviceIds.has(id) && !selectedDevices.has(id);
              const otherResource = isMappedElsewhere
                ? existingMappings.find(m => m.deviceId === id)?.resourceName
                : null;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleDevice(id)}
                  disabled={isMappedElsewhere}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200'
                      : isMappedElsewhere
                        ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm ${isSelected ? 'text-brand-700 font-medium' : 'text-gray-700'}`}>
                      {name}
                    </span>
                  </div>
                  {isMappedElsewhere && (
                    <p className="text-xs text-gray-400 mt-1 ml-6">→ {otherResource}</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Temperature settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zieltemperatur: {targetTemperature}°C
            </label>
            <TemperatureSlider
              value={targetTemperature}
              onChange={setTargetTemperature}
              min={15}
              max={30}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leerlauftemperatur: {idleTemperature}°C
            </label>
            <TemperatureSlider
              value={idleTemperature}
              onChange={setIdleTemperature}
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
              value={preheatMinutes}
              onChange={e => setPreheatMinutes(parseInt(e.target.value) || 0)}
              min={0}
              max={120}
              className="input"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
        <button onClick={onCancel} className="btn-secondary text-sm">Abbrechen</button>
        <button
          onClick={handleSave}
          disabled={saving || !resourceId || selectedDevices.size === 0}
          className="btn-primary text-sm"
        >
          {saving ? 'Speichern...' : `${selectedDevices.size} Thermostat${selectedDevices.size !== 1 ? 'e' : ''} speichern`}
        </button>
      </div>
    </div>
  );
}
