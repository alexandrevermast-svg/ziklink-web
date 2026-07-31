// src/components/TimePicker.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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
  const [open, setOpen] = useState(false);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const [h, m] = value ? value.split(':') : ['', ''];

  // Recentre les colonnes sur la valeur déjà sélectionnée à l'ouverture.
  // rAF nécessaire : le contenu du Popover Radix (portalé) n'est pas encore
  // monté dans le DOM au moment où `open` bascule à true.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      for (const ref of [hourListRef, minuteListRef]) {
        const selected = ref.current?.querySelector('[data-selected="true"]');
        selected?.scrollIntoView({ block: 'center', behavior: 'instant' });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const selectHour = (newH: string) => {
    onChange(`${newH}:${m || '00'}`);
  };

  const selectMinute = (newM: string) => {
    if (!h) return;
    onChange(`${h}:${newM}`);
    setOpen(false);
  };

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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'w-full h-9 justify-start text-left font-normal bg-zik-card border-zik-border text-zik-text hover:bg-zik-card-hover gap-2',
              !value && 'text-zik-muted'
            )}
          >
            <Clock className="h-4 w-4 text-zik-purple shrink-0" />
            {value ? value : <span>--:--</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-36 p-0 bg-zik-card border-zik-border shadow-lg" align="start">
          <div className="flex divide-x divide-zik-border">
            <div ref={hourListRef} className="flex-1 max-h-56 overflow-y-auto py-1">
              {HOURS.map((hour) => (
                <button
                  type="button"
                  key={hour}
                  data-selected={h === hour}
                  onClick={() => selectHour(hour)}
                  className={cn(
                    'w-full text-center text-sm py-1.5 transition-colors',
                    h === hour ? 'bg-zik-purple text-white hover:bg-zik-purple/90' : 'text-zik-text hover:bg-zik-card-hover'
                  )}
                >
                  {hour}
                </button>
              ))}
            </div>
            <div ref={minuteListRef} className="flex-1 max-h-56 overflow-y-auto py-1">
              {MINUTES.map((min) => (
                <button
                  type="button"
                  key={min}
                  data-selected={!!h && m === min}
                  onClick={() => selectMinute(min)}
                  disabled={!h}
                  className={cn(
                    'w-full text-center text-sm py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                    h && m === min ? 'bg-zik-purple text-white hover:bg-zik-purple/90' : 'text-zik-text hover:bg-zik-card-hover'
                  )}
                >
                  {min}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
