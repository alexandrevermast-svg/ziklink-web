"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

interface LocationPickerMapProps {
  center: { lat: number; lng: number };
  selectedLocation: { lat: number; lng: number } | null;
  onLocationChange: (location: { lat: number; lng: number; address: string }) => void;
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
// isolation: isolate crée un stacking context local → Leaflet ne percera plus jamais au-dessus du Dialog
<div className="h-full w-full" style={{ isolation: "isolate" }}>
  <MapContainer
    center={[center.lat, center.lng]}
    zoom={13}
    style={{ height: "100%", width: "100%" }}
  >
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    />
    {selectedLocation && (
      <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
    )}
    <MapClickHandler onLocationChange={onLocationChange} />
  </MapContainer>
</div>
  );
}