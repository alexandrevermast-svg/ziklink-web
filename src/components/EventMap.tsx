"use client";

import React, { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import L from "leaflet";

export interface EventMarker {
  id: string;
  title: string;
  start_time: string;
  lat: number;
  lng: number;
  type: "jam" | "concert";
  is_open?: boolean;
  isParticipant?: boolean;
  isCreator?: boolean;
  artist?: string | null;
  isInterested?: boolean;
}

interface EventMapProps {
  markers: EventMarker[];
  onJoinJam?: (jamId: string) => void;
  currentUserId: string | null;
  emptyMessage?: string;
  height?: string;
}

function createDotIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 14px; height: 14px;
      background: ${color};
      border: 2.5px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

const JAM_ICON     = createDotIcon("#22c55e");
const CONCERT_ICON = createDotIcon("#ef4444");

// ✅ Force Leaflet à recalculer la taille après montage dans un onglet
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    // Petit délai pour laisser le DOM se stabiliser (transition d'onglet)
    const timer = setTimeout(() => { map.invalidateSize(); }, 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function FitBounds({ markers }: { markers: EventMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    if (markers.length === 1) { map.setView([markers[0].lat, markers[0].lng], 13); return; }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [markers, map]);
  return null;
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function formatDay(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

export default function EventMap({
  markers,
  onJoinJam,
  currentUserId,
  emptyMessage = "Aucun événement 📍",
  height = "h-52",
}: EventMapProps) {
  const hasJam     = useMemo(() => markers.some((m) => m.type === "jam"),     [markers]);
  const hasConcert = useMemo(() => markers.some((m) => m.type === "concert"), [markers]);

  if (markers.length === 0) {
    return (
      <div className={`${height} flex flex-col items-center justify-center gap-2 bg-gray-100 rounded-xl text-sm text-gray-400`}>
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div style={{ isolation: "isolate" }} className={`${height} rounded-xl overflow-hidden border border-gray-200 shadow-sm relative`}>
      {(hasJam || hasConcert) && (
        <div className="absolute bottom-2 left-2 z-1000 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow text-[11px] font-medium text-gray-600 pointer-events-none">
          {hasJam && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500 border border-white shadow-sm" /> Jam
            </span>
          )}
          {hasConcert && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 border border-white shadow-sm" /> Concert
            </span>
          )}
        </div>
      )}

      <MapContainer
        center={[markers[0].lat, markers[0].lng]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {/* ✅ Ajouté ici */}
        <InvalidateSize />
        <FitBounds markers={markers} />

        {markers.map((m) => (
          <Marker
            key={`${m.type}-${m.id}`}
            position={[m.lat, m.lng]}
            icon={m.type === "jam" ? JAM_ICON : CONCERT_ICON}
          >
            <Popup>
              <div className="text-sm min-w-40">
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 ${
                  m.type === "jam" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>
                  {m.type === "jam" ? "🎸 Jam" : "🎤 Concert"}
                </span>
                <p className="font-semibold text-gray-900 mb-0.5">{m.title}</p>
                {m.type === "concert" && m.artist && (
                  <p className="text-blue-600 text-xs font-medium mb-0.5">{m.artist}</p>
                )}
                <p className="text-gray-500 text-xs mb-2">
                  {formatDay(m.start_time)} · {formatTime(m.start_time)}
                </p>
                {m.type === "jam" && currentUserId && !m.isCreator && (
                  m.isParticipant
                    ? <span className="text-xs text-green-600 font-medium">✓ Inscrit</span>
                    : <button
                        onClick={() => onJoinJam?.(m.id)}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors"
                      >
                        Rejoindre
                      </button>
                )}
                {m.type === "jam" && m.isCreator && (
                  <span className="text-xs text-gray-400 italic">Organisateur</span>
                )}
                {m.type === "concert" && m.isInterested && (
                  <span className="text-xs font-medium text-red-500">❤️ Intéressé</span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}