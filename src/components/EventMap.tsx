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
      border: 2.5px solid var(--zik-bg);
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

// ✅ Couleurs adaptées à ton thème
const JAM_ICON     = createDotIcon("var(--zik-emerald)");
const CONCERT_ICON = createDotIcon("var(--zik-red)");

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
      // ✅ Fond et texte adaptés à ton thème
      <div className={`${height} flex flex-col items-center justify-center gap-2 bg-zik-card rounded-xl text-sm text-zik-muted`}>
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    // ✅ Bordure et ombre adaptées
    // Bordure légèrement plus visible sur la carte
<div
  style={{ isolation: "isolate", borderColor: 'rgba(192,132,252,0.15)' }}
  className={`${height} rounded-xl overflow-hidden border shadow-lg relative`}
>
      {(hasJam || hasConcert) && (
        // ✅ Fond et texte de la légende adaptés
        <div className="absolute bottom-2 left-2 z-1000 flex items-center gap-2 bg-zik-card/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow text-[11px] font-medium text-zik-text pointer-events-none">
          {hasJam && (
            <span className="flex items-center gap-1">
              {/* ✅ Couleur de la légende adaptée */}
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-zik-emerald border border-zik-bg shadow-sm" /> Jam
            </span>
          )}
          {hasConcert && (
            <span className="flex items-center gap-1">
              {/* ✅ Couleur de la légende adaptée */}
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-zik-red border border-zik-bg shadow-sm" /> Concert
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
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
  attribution='&copy; OpenStreetMap contributors &copy; CARTO'
  maxZoom={19}
  crossOrigin="anonymous"
/>
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
                {/* ✅ Badge de type d'événement adapté */}
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1 ${
                  m.type === "jam" ? "bg-zik-emerald/20 text-zik-emerald" : "bg-zik-red/20 text-zik-red"
                }`}>
                  {m.type === "jam" ? "🎸 Jam" : "🎤 Concert"}
                </span>

                {/* ✅ Titre adapté */}
                <p className="font-semibold text-zik-text mb-0.5">{m.title}</p>

                {m.type === "concert" && m.artist && (
                  <p className="text-zik-purple text-xs font-medium mb-0.5">{m.artist}</p>
                )}

                {/* ✅ Date et heure adaptées */}
                <p className="text-zik-muted text-xs mb-2">
                  {formatDay(m.start_time)} · {formatTime(m.start_time)}
                </p>

                {m.type === "jam" && currentUserId && !m.isCreator && (
                  m.isParticipant
                    ? <span className="text-xs text-zik-emerald font-medium">✓ Inscrit</span>
                    : <button
                        onClick={() => onJoinJam?.(m.id)}
                        className="text-xs bg-zik-purple text-white px-3 py-1 rounded-full hover:bg-zik-indigo transition-colors"
                      >
                        Rejoindre
                      </button>
                )}

                {m.type === "jam" && m.isCreator && (
                  <span className="text-xs text-zik-muted italic">Organisateur</span>
                )}

                {m.type === "concert" && m.isInterested && (
                  <span className="text-xs font-medium text-zik-red">❤️ Intéressé</span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}