import React from 'react';

export default function TemperatureGauge({ temperature, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-16 h-16 text-lg',
    lg: 'w-20 h-20 text-xl',
  };

  // Color based on temperature
  const getColor = (temp) => {
    if (temp <= 16) return 'from-blue-400 to-blue-500 text-blue-50';
    if (temp <= 20) return 'from-blue-300 to-orange-400 text-white';
    if (temp <= 24) return 'from-orange-400 to-orange-500 text-orange-50';
    return 'from-red-400 to-red-500 text-red-50';
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${getColor(temperature)} flex items-center justify-center font-bold flex-shrink-0`}
    >
      {temperature}°
    </div>
  );
}
