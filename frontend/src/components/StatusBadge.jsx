import React from 'react';

export default function StatusBadge({ active }) {
  return (
    <span className={`badge ${active ? 'badge-green' : 'badge-red'}`}>
      <span className={`w-2 h-2 rounded-full mr-1.5 ${active ? 'bg-green-500' : 'bg-red-500'}`} />
      {active ? 'Aktiv' : 'Inaktiv'}
    </span>
  );
}
