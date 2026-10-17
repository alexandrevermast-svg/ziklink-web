"use client";

import React, { useEffect, useMemo, useRef } from "react";
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
  onMarkerClick?: (marker: EventMarker) => void;
  currentUserId: string | null;
  emptyMessage?: string;
  height?: string;
  focusMarkerId?: string | null;
}

function createDotIcon(background: string, glow: string, dimmed = false) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 14px; height: 14px;
      background: ${background};
      border: 2.5px solid var(--zik-bg);
      border-radius: 50%;
      opacity: ${dimmed ? 0.7 : 1};
      box-shadow: 0 1px 4px rgba(0,0,0,0.5), 0 0 10px 2px ${glow};
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

// ✅ Couleurs adaptées à ton thème — jam en ambre avec halo, concert reste rouge
const JAM_ICON        = createDotIcon("linear-gradient(135deg, #FBBF24, #F59E0B)", "rgba(251,191,36,0.55)");
// Version atténuée des pins jam non sélectionnés — pour que le pin sélectionné
// se détache nettement dès qu'une jam est choisie dans la liste ou sur la carte.
const JAM_ICON_DIMMED  = createDotIcon("linear-gradient(135deg, #FBBF24, #F59E0B)", "rgba(251,191,36,0.55)", true);
const CONCERT_ICON    = createDotIcon("var(--zik-red)", "rgba(248,113,113,0.5)");

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
  // Ne cadre qu'une seule fois (au premier affichage des marqueurs) — sinon
  // sélectionner une jam sur la carte (ou tout autre re-rendu) redéclenchait
  // ce fitBounds et dézoomait la carte sous l'utilisateur.
  const hasFit = useRef(false);
  useEffect(() => {
    if (hasFit.current || markers.length === 0) return;
    hasFit.current = true;
    if (markers.length === 1) { map.setView([markers[0].lat, markers[0].lng], 13); return; }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [markers, map]);
  return null;
}

// Centre la carte sur le marqueur sélectionné (clic sur une card dans la
// liste), sans toucher au cadrage initial géré par FitBounds.
function FocusMarker({ markers, focusId }: { markers: EventMarker[]; focusId?: string | null }) {
  const map = useMap();
  const lastFocused = useRef<string | null>(null);
  useEffect(() => {
    if (!focusId || focusId === lastFocused.current) return;
    const marker = markers.find((m) => m.id === focusId);
    if (!marker) return;
    lastFocused.current = focusId;
    map.panTo([marker.lat, marker.lng], { animate: true });
  }, [focusId, markers, map]);
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
  onMarkerClick,
  currentUserId,
  emptyMessage = "Aucun événement 📍",
  height = "h-52",
  focusMarkerId,
}: EventMapProps) {
  const hasJam     = useMemo(() => markers.some((m) => m.type === "jam"),     [markers]);
  const hasConcert = useMemo(() => markers.some((m) => m.type === "concert"), [markers]);

  if (markers.length === 0) {
    return (
      // ✅ Fond et texte adaptés à ton thème
      <div className={`${height} flex flex-col items-center justify-center gap-2 bg-white/4 backdrop-blur-md border border-white/8 rounded-2xl text-sm text-gray-400`}>
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    // ✅ Bordure et ombre adaptées
    // Bordure légèrement plus visible sur la carte
<div
  style={{ isolation: "isolate", borderColor: 'rgba(255,255,255,0.08)' }}
  className={`${height} rounded-2xl overflow-hidden border shadow-lg relative`}
>
      {(hasJam || hasConcert) && (
        <div className="absolute bottom-2 left-2 z-1000 flex items-center gap-2 bg-white/6 backdrop-blur-md border border-white/8 rounded-full px-2.5 py-1 shadow text-[11px] font-medium text-white pointer-events-none">
          {hasJam && (
            <span className="flex items-center gap-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full border border-zik-bg shadow-sm"
                style={{ background: "linear-gradient(135deg, #FBBF24, #F59E0B)" }}
              /> Jam
            </span>
          )}
          {hasConcert && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-zik-red border border-zik-bg shadow-sm" /> Concert
            </span>
          )}
        </div>
      )}

      <MapContainer
        center={[markers[0].lat, markers[0].lng]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <TileLayer
  url={`https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${process.env.NEXT_PUBLIC_CARTO_API_KEY}`}
  attribution='&copy; OpenStreetMap contributors &copy; CARTO'
  maxZoom={19}
  crossOrigin="anonymous"
/>
        <InvalidateSize />
        <FitBounds markers={markers} />
        <FocusMarker markers={markers} focusId={focusMarkerId} />

        {markers.map((m) => {
          const skipPopup = m.type === "jam" && !!onMarkerClick;
          const isDimmed = m.type === "jam" && !!focusMarkerId && m.id !== focusMarkerId;
          return (
          <Marker
            key={`${m.type}-${m.id}`}
            position={[m.lat, m.lng]}
            icon={m.type === "jam" ? (isDimmed ? JAM_ICON_DIMMED : JAM_ICON) : CONCERT_ICON}
            eventHandlers={skipPopup ? { click: () => onMarkerClick!(m) } : undefined}
          >
            {!skipPopup && (
              <Popup>
                <div className="text-sm min-w-32 leading-tight">
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    m.type === "jam" ? "bg-amber-400/20 text-amber-400" : "bg-zik-red/20 text-zik-red"
                  }`}>
                    {m.type === "jam" ? "🎸 Jam" : "🎤 Concert"}
                  </span>

                  <p className="font-semibold text-white">{m.title}</p>

                  {m.type === "concert" && m.artist && (
                    <p className="text-zik-grad-to text-xs font-medium">{m.artist}</p>
                  )}

                  <p className="text-gray-400 text-xs mb-1">
                    {formatDay(m.start_time)} · {formatTime(m.start_time)}
                  </p>

                  {m.type === "jam" && currentUserId && !m.isCreator && (
                    m.isParticipant
                      ? <span className="text-xs text-zik-emerald font-medium">✓ Inscrit</span>
                      : <button
                          onClick={() => onJoinJam?.(m.id)}
                          className="text-xs bg-linear-to-br from-zik-grad-from to-zik-grad-to text-white px-3 py-0.5 rounded-full hover:brightness-110 transition-all"
                        >
                          Rejoindre
                        </button>
                  )}

                  {m.type === "jam" && m.isCreator && (
                    <span className="text-xs text-gray-400 italic">Organisateur</span>
                  )}

                  {m.type === "concert" && m.isInterested && (
                    <span className="text-xs font-medium text-zik-red">❤️ Intéressé</span>
                  )}
                </div>
              </Popup>
            )}
          </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}