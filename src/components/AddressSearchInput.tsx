// src/components/AddressSearchInput.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface AddressResult {
  address: string;
  lat: number;
  lng: number;
}

interface AddressSearchInputProps {
  value: string;
  onChange: (result: AddressResult) => void;
  onClear?: () => void;
  placeholder?: string;
}

export default function AddressSearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Rechercher une adresse...',
}: AddressSearchInputProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync value externe
  useEffect(() => {
    if (value !== query) {
      setQuery(value);
      setSelected(!!value);
    }
  }, [value]);

  // Fermer au clic dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); setIsOpen(false); return; }
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setIsOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    setSelected(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 400);
  };

  const handleSelect = (result: NominatimResult) => {
    const address = result.display_name;
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setQuery(address);
    setSelected(true);
    setIsOpen(false);
    setResults([]);
    onChange({ address, lat, lng });
  };

  const handleClear = () => {
    setQuery('');
    setSelected(false);
    setResults([]);
    setIsOpen(false);
    onClear?.();
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div
        className="flex items-center gap-2 rounded-xl transition-all duration-150"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid',
          borderColor: isOpen
            ? 'rgba(192,132,252,0.40)'
            : selected
            ? 'rgba(52,211,153,0.40)'
            : 'rgba(255,255,255,0.10)',
          padding: '10px 14px',
        }}
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin shrink-0" style={{ color: '#C084FC' }} />
        ) : (
          <MapPin
            size={16}
            className="shrink-0"
            style={{ color: selected ? '#34D399' : 'rgba(255,255,255,0.35)' }}
          />
        )}

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: '#F1F0F6' }}
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 transition-colors"
            style={{ color: 'rgba(255,255,255,0.30)' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Adresse sélectionnée — confirmation visuelle */}
      {selected && query && (
        <p className="text-xs mt-1.5 px-1" style={{ color: '#34D399' }}>
          ✓ Adresse enregistrée
        </p>
      )}

      {/* Dropdown résultats */}
      {isOpen && results.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 rounded-xl overflow-hidden z-50"
          style={{
            background: '#1A1628',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          }}
        >
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-100"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(192,132,252,0.08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <MapPin
                size={14}
                className="shrink-0 mt-0.5"
                style={{ color: '#C084FC' }}
              />
              <span
                className="text-sm leading-snug"
                style={{ color: 'rgba(255,255,255,0.75)' }}
              >
                {result.display_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}