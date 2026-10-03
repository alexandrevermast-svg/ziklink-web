"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

interface LocationPickerMapProps {
  center: { lat: number; lng: number };
  selectedLocation: { lat: number; lng: number } | null;
  onLocationChange: (location: { lat: number; lng: number; address: string }) => void;
}

// La carte s'ouvre dans une modale qui vient d'apparaître/se redimensionner :
// sans ça Leaflet garde la taille mesurée au montage et le quadrillage des
// tuiles se décale au zoom, laissant des zones blanches.
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    const t3 = setTimeout(() => map.invalidateSize(), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [map]);
  return null;
}

function MapClickHandler({ onLocationChange }: Pick<LocationPickerMapProps, "onLocationChange">) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        const address = data.display_name || "Adresse non trouvée";
        onLocationChange({ lat, lng, address });
      } catch {
        onLocationChange({ lat, lng, address: "Adresse non trouvée" });
      }
    },
  });
  return null;
}

export default function LocationPickerMap({
  center,
  selectedLocation,
  onLocationChange,
}: LocationPickerMapProps) {
  return (
    // ✅ Container avec ton thème
    <div className="h-full w-full rounded-lg overflow-hidden" style={{ isolation: "isolate" }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        {/* ✅ Tuiles en mode sombre */}
        <TileLayer
          url={`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          crossOrigin="anonymous"
        />
        <InvalidateSize />
        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
        )}
        <MapClickHandler onLocationChange={onLocationChange} />
      </MapContainer>
    </div>
  );
}