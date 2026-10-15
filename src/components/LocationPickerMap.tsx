"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
  name?: string;
  street?: string;
  postcode?: string;
  city?: string;
}

interface LocationPickerMapProps {
  center: { lat: number; lng: number };
  selectedLocation: { lat: number; lng: number } | null;
  onLocationChange: (location: PickedLocation) => void;
}

function MapClickHandler({ onLocationChange }: Pick<LocationPickerMapProps, "onLocationChange">) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng;
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
        );
        const data = await response.json();
        const address = data.display_name || "Adresse non trouvée";
        const addr = data.address;
        const name = data.name || undefined;
        const street = addr ? [addr.house_number, addr.road].filter(Boolean).join(" ") || undefined : undefined;
        const postcode = addr?.postcode;
        const city = addr?.city || addr?.town || addr?.village || addr?.municipality;
        onLocationChange({ lat, lng, address, name, street, postcode, city });
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
          url={`https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`}
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