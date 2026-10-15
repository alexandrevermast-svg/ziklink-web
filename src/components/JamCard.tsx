"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Clock, UserPlus, Check, Drum, Piano, LocateFixed, Heart, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareButton from "@/components/ShareButton";
import { MapLink } from "@/components/MapLink";
import { formatDistanceKm } from "@/lib/geo";
import { joinOpensAt } from "@/lib/jamJoinWindow";
import { getDisplayAddress, getMapsUrl } from "@/lib/eventLocation";
import { genreColor } from "@/lib/musicGenres";

export interface JamCardData {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_at: string | null;
  location: string | null;
  is_open: boolean;
  has_drums: boolean;
  has_keyboard: boolean;
  genres?: string[] | null;
  poster_url?: string | null;
}

interface JamCardProps {
  jam: JamCardData;
  isCreator: boolean;
  isParticipant: boolean;
  isJoining: boolean;
  isInterested: boolean;
  isInterestPending: boolean;
  joinOpen: boolean;
  distanceKm?: number;
  participantCount?: number;
  interestedCount?: number;
  isSelected?: boolean;
  onToggleInterest: (jamId: string, e: React.MouseEvent) => void;
  onJoin: (jamId: string, e: React.MouseEvent) => void;
  onLeave: (jamId: string, e: React.MouseEvent) => void;
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function JamCard({
  jam, isCreator, isParticipant, isJoining, isInterested, isInterestPending, joinOpen, distanceKm,
  participantCount, interestedCount, isSelected,
  onToggleInterest, onJoin, onLeave,
}: JamCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const address = getDisplayAddress(jam.location);
  const mapsUrl = getMapsUrl(jam.location);
  const hasDetails = !!jam.poster_url || !!jam.description?.trim();
  const showDetails = hasDetails && (expanded || !!isSelected);

  return (
    <div
      onClick={() => { if (hasDetails) setExpanded((v) => !v); }}
      className={`relative overflow-hidden rounded-xl border border-zik-indigo/35 p-4 hover:bg-zik-card-hover hover:border-zik-indigo/55 hover:shadow-sm transition-all bg-zik-card ${
        hasDetails ? "cursor-pointer active:scale-[0.99]" : ""
      }`}
    >

      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-zik-text truncate flex-1 min-w-0">{jam.title}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          <span title={jam.has_drums ? "Batterie disponible" : "Pas de batterie"}
            className={`h-6 w-6 rounded-full flex items-center justify-center ${
              jam.has_drums ? "bg-zik-emerald/15 text-zik-emerald" : "bg-white/5 text-zik-muted/40"
            }`}>
            <Drum className="h-3.5 w-3.5" />
          </span>
          <span title={jam.has_keyboard ? "Clavier disponible" : "Pas de clavier"}
            className={`h-6 w-6 rounded-full flex items-center justify-center ${
              jam.has_keyboard ? "bg-zik-emerald/15 text-zik-emerald" : "bg-white/5 text-zik-muted/40"
            }`}>
            <Piano className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex flex-wrap gap-3 text-sm text-zik-text">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-zik-muted" />
            {formatTime(jam.start_time)}
            {jam.end_at && ` → ${formatTime(jam.end_at)}`}
          </span>
          {distanceKm !== undefined && (
            <span className="flex items-center gap-1 text-zik-purple font-medium">
              <LocateFixed className="h-3.5 w-3.5" />
              {formatDistanceKm(distanceKm)}
            </span>
          )}
        </div>
        {address && (
          <MapLink address={address} mapsUrl={mapsUrl} className="flex items-start gap-1 text-sm text-zik-text mt-1 text-left hover:text-zik-purple hover:underline">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-zik-muted mt-0.5" />
            <span className="line-clamp-2">{address}</span>
          </MapLink>
        )}
      </div>

      {hasDetails && (
        <div className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
          showDetails ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
        }`}>
          <div className="min-h-0">
            {jam.poster_url && (
              <img src={jam.poster_url} alt="" className="w-full h-36 object-cover rounded-lg mb-2" />
            )}
            {jam.description?.trim() && (
              <p className="text-sm text-zik-muted whitespace-pre-line">{jam.description}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="flex flex-wrap gap-1 min-w-0">
          {jam.genres?.map((g) => (
            <span key={g}
              className="shrink-0 text-xs font-medium px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${genreColor(g)}1A`, color: genreColor(g) }}
            >
              {g}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); router.push(`/events/jams/${jam.id}`); }}
            title="Voir la jam en détail"
            className="h-7 w-7 flex items-center justify-center rounded-full text-zik-muted hover:text-zik-purple hover:bg-zik-purple/10 transition-colors"
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>
          <ShareButton url={`/events/jams/${jam.id}`} title={jam.title} text={jam.description ?? undefined} />
          {!isCreator && (
            <button
              onClick={(e) => onToggleInterest(jam.id, e)}
              disabled={isInterestPending}
              title={isInterested ? "Ne plus être intéressé" : "Je suis intéressé"}
              className="h-7 w-7 flex items-center justify-center rounded-full text-zik-muted hover:text-zik-red hover:bg-zik-red/10 transition-colors disabled:opacity-50"
            >
              <Heart className={`h-4 w-4 ${isInterested ? "text-zik-red fill-zik-red" : ""}`} />
            </button>
          )}
          {!isCreator && (
            isParticipant ? (
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-zik-emerald/30 text-zik-emerald hover:bg-zik-red/10 hover:border-zik-red/30 hover:text-zik-red transition-colors"
                onClick={(e) => onLeave(jam.id, e)}
                disabled={isJoining}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {isJoining ? "..." : "Inscrit"}
              </Button>
            ) : joinOpen ? (
              <Button
                size="sm"
                className="text-xs bg-zik-purple hover:bg-zik-indigo"
                onClick={(e) => onJoin(jam.id, e)}
                disabled={isJoining}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                {isJoining ? "..." : "Rejoindre"}
              </Button>
            ) : (
              <span className="text-[10px] text-zik-muted italic">
                Inscriptions dès {formatTime(joinOpensAt(jam.start_time).toISOString())}
              </span>
            )
          )}
          {isCreator && (
            <span className="text-xs text-zik-muted italic">
              {participantCount ?? 0} inscrit{(participantCount ?? 0) > 1 ? "s" : ""} · {interestedCount ?? 0} intéressé{(interestedCount ?? 0) > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
