"use client";

import { useRouter } from "next/navigation";
import { MapPin, Clock, UserPlus, Check, Drum, Piano, LocateFixed, Heart, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareButton from "@/components/ShareButton";
import { MapLink } from "@/components/MapLink";
import { formatDistanceKm } from "@/lib/geo";
import { joinOpensAt } from "@/lib/jamJoinWindow";
import { getAddressParts, getMapsUrl } from "@/lib/eventLocation";
import { genreColor } from "@/lib/musicGenres";
import { linkifyText } from "@/lib/linkify";

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
  expanded: boolean;
  onToggleExpand: (jamId: string) => void;
  cardRef?: (el: HTMLDivElement | null) => void;
  onToggleInterest: (jamId: string, e: React.MouseEvent) => void;
  onJoin: (jamId: string, e: React.MouseEvent) => void;
  onLeave: (jamId: string, e: React.MouseEvent) => void;
}

function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

const DEFAULT_JAM_POSTER = "/images/jam-default-poster.jpg";
const GENRE_POSTERS: Record<string, string> = {
  Jazz: "/images/jam-default-poster-jazz.jpg",
};

export default function JamCard({
  jam, isCreator, isParticipant, isJoining, isInterested, isInterestPending, joinOpen, distanceKm,
  participantCount, interestedCount, expanded, onToggleExpand, cardRef,
  onToggleInterest, onJoin, onLeave,
}: JamCardProps) {
  const router = useRouter();
  const addressParts = getAddressParts(jam.location);
  const mapsUrl = getMapsUrl(jam.location);
  const matchedGenre = jam.genres?.find((g) => GENRE_POSTERS[g]);
  const posterUrl = jam.poster_url || (matchedGenre ? GENRE_POSTERS[matchedGenre] : DEFAULT_JAM_POSTER);

  return (
    <div
      ref={cardRef}
      onClick={() => onToggleExpand(jam.id)}
      className="relative overflow-hidden rounded-2xl border border-white/8 p-4 bg-white/4 backdrop-blur-md hover:bg-white/6 hover:border-white/14 transition-all cursor-pointer active:scale-[0.99]"
    >

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-white truncate flex-1 min-w-0">{jam.title}</h3>
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
        <div className="flex flex-wrap gap-3 text-sm text-gray-300">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(jam.start_time)}
            {jam.end_at && ` → ${formatTime(jam.end_at)}`}
          </span>
          {distanceKm !== undefined && (
            <span className="flex items-center gap-1 text-zik-grad-to font-medium">
              <LocateFixed className="h-3.5 w-3.5" />
              {formatDistanceKm(distanceKm)}
            </span>
          )}
        </div>
        {addressParts && (addressParts.name || addressParts.detail) && (
          <MapLink
            address={[addressParts.name, addressParts.detail].filter(Boolean).join(", ")}
            mapsUrl={mapsUrl}
            className="group flex items-start gap-1.5 mt-1 text-left"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-300 mt-0.5 group-hover:text-zik-grad-to transition-colors" />
            <span className="min-w-0 leading-tight">
              {addressParts.name && <span className="block text-sm text-gray-200">{addressParts.name}</span>}
              {addressParts.detail && (
                <span className={`block line-clamp-2 text-gray-400 ${addressParts.name ? "text-xs mt-0.5" : "text-sm"}`}>
                  {addressParts.detail}
                </span>
              )}
            </span>
          </MapLink>
        )}
      </div>

      <div className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
        expanded ? "grid-rows-[1fr] opacity-100 mt-3" : "grid-rows-[0fr] opacity-0"
      }`}>
        <div className="min-h-0">
          <img
            src={posterUrl}
            alt=""
            className="w-full max-h-96 object-contain rounded-lg mb-2 bg-zik-card"
            style={{
              maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
            }}
          />
          {jam.description?.trim() && (
            <p className="text-sm text-gray-300 whitespace-pre-line">{linkifyText(jam.description)}</p>
          )}
        </div>
      </div>

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
            className="h-7 w-7 flex items-center justify-center rounded-full text-gray-300 hover:text-zik-grad-to hover:bg-white/8 transition-colors"
          >
            <ArrowUpRight className="h-4 w-4" />
          </button>
          <ShareButton
            url={`/events/jams/${jam.id}`}
            title={jam.title}
            text={jam.description ?? undefined}
            className="h-7 w-7 flex items-center justify-center rounded-full text-gray-300 hover:text-zik-grad-to hover:bg-white/8 transition-colors"
          />
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
                className="text-xs bg-linear-to-br from-zik-grad-from to-zik-grad-to hover:brightness-110 border-0 text-white"
                onClick={(e) => onJoin(jam.id, e)}
                disabled={isJoining}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1" />
                {isJoining ? "..." : jam.is_open ? "Rejoindre" : "Demander à rejoindre"}
              </Button>
            ) : (
              <span className="text-[10px] text-gray-300 italic">
                Inscriptions dès {formatTime(joinOpensAt(jam.start_time).toISOString())}
              </span>
            )
          )}
          {isCreator && (
            <span className="text-xs text-gray-300 italic">
              {participantCount ?? 0} inscrit{(participantCount ?? 0) > 1 ? "s" : ""} · {interestedCount ?? 0} intéressé{(interestedCount ?? 0) > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
