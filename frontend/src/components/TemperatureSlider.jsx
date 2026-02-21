import React from 'react';

export default function TemperatureSlider({ value, onChange, min = 5, max = 30 }) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="relative pt-1">
      <input
        type="range"
        min={min}
        max={max}
        step={0.5}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #f59e0b ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{min}°C</span>
        <span>{max}°C</span>
      </div>
    </div>
  );
}
