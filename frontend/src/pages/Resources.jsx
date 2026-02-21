import React from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';

export default function Resources() {
  const { data: resources, loading, error } = useApi(() => api.getResources());

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
        <p className="text-red-700">Fehler beim Laden der Ressourcen: {error}</p>
        <p className="text-sm text-red-500 mt-1">
          Stelle sicher, dass die ChurchTools-Konfiguration in der .env korrekt ist.
        </p>
      </div>
    );
  }

  if (!resources || resources.length === 0) {
    return (
      <div className="card">
        <p className="text-gray-500">Keine Ressourcen in ChurchTools gefunden.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">ChurchTools Ressourcen</h2>
        <p className="text-sm text-gray-500 mt-1">
          Alle verfügbaren Ressourcen aus deiner ChurchTools-Instanz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resources.map(resource => (
          <div key={resource.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-gray-900">{resource.name}</h3>
                {resource.resourceType && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {resource.resourceType.name || resource.resourceType}
                  </p>
                )}
              </div>
              <span className="badge badge-blue">ID: {resource.id}</span>
            </div>

            {resource.description && (
              <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                {resource.description}
              </p>
            )}

            {resource.location && (
              <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {resource.location}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
