// src/components/TimePicker.tsx
'use client';

import { Clock } from 'lucide-react';

interface TimePickerProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  label?: string;
  optional?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

export default function TimePicker({
  value,
  onChange,
  required,
  label,
  optional,
}: TimePickerProps) {
  const [h, m] = value ? value.split(':') : ['', ''];

  return (
    <div>
      {label && (
        <label className="text-sm font-medium text-zik-text flex items-center gap-1.5 mb-1">
          <Clock className="h-4 w-4 text-zik-purple" />
          {label}
          {required && <span className="text-zik-red">*</span>}
          {optional && <span className="text-zik-muted font-normal">(opt.)</span>}
        </label>
      )}
      <div className="flex items-center bg-zik-card border border-zik-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-zik-purple/50 w-28">
        <select
          value={h || ''}
          onChange={(e) => onChange(e.target.value ? `${e.target.value}:${m || '00'}` : '')}
          required={required}
          className="flex-1 bg-transparent border-0 py-1.5 pl-2 pr-0 text-xs text-zik-text focus:outline-none appearance-none text-center cursor-pointer"
        >
          <option value="">--</option>
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>{hour}</option>
          ))}
        </select>

        <span className="text-zik-muted font-bold shrink-0 select-none text-xs">:</span>

        <select
          value={m || ''}
          onChange={(e) => onChange(h ? `${h}:${e.target.value}` : '')}
          className="flex-1 bg-transparent border-0 py-1.5 pr-2 pl-0 text-xs text-zik-text focus:outline-none appearance-none text-center cursor-pointer"
        >
          <option value="">--</option>
          {MINUTES.map((min) => (
            <option key={min} value={min}>{min}</option>
          ))}
        </select>
      </div>
    </div>
  );
}