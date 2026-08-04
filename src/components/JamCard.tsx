"use client";

import { useRouter } from "next/navigation";
import { Lock, Unlock, MapPin, Clock, UserPlus, Check, Drum, Piano, LocateFixed, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareButton from "@/components/ShareButton";
import { formatDistanceKm } from "@/lib/geo";
import { joinOpensAt } from "@/lib/jamJoinWindow";

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
  onToggleInterest: (jamId: string, e: React.MouseEvent) => void;
  onJoin: (jamId: string, e: React.MouseEvent) => void;
  onLeave: (jamId: string, e: React.MouseEvent) => void;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}
function getAddress(s: string | null) {
  if (!s) return null;
  try { return JSON.parse(s)?.address ?? null; } catch { return null; }
}

export default function JamCard({
  jam, isCreator, isParticipant, isJoining, isInterested, isInterestPending, joinOpen, distanceKm,
  participantCount, interestedCount,
  onToggleInterest, onJoin, onLeave,
}: JamCardProps) {
  const router = useRouter();
  const address = getAddress(jam.location);

  return (
    <div
      onClick={() => router.push(`/events/jams/${jam.id}`)}
      className="rounded-lg border border-zik-border p-4 hover:border-zik-purple/30 hover:shadow-sm transition-all cursor-pointer active:scale-[0.99] bg-zik-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-zik-text truncate">{jam.title}</h3>
          <p className="text-base text-zik-text/80 mt-1 line-clamp-1">{jam.description}</p>
        </div>
        <span className={`shrink-0 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
          jam.is_open ? "bg-zik-emerald/10 text-zik-emerald" : "bg-zik-orange/10 text-zik-orange"
        }`}>
          {jam.is_open ? <><Unlock className="h-3 w-3" /> Ouverte</> : <><Lock className="h-3 w-3" /> Inscription requise</>}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex flex-wrap gap-3 text-sm text-zik-text">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-zik-muted" />
            {formatDate(jam.start_time)} · {formatTime(jam.start_time)}
            {jam.end_at && ` → ${formatTime(jam.end_at)}`}
          </span>
          {address && (
            <span className="flex items-center gap-1 truncate max-w-xs">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-zik-muted" />{address}
            </span>
          )}
          {distanceKm !== undefined && (
            <span className="flex items-center gap-1 text-zik-purple font-medium">
              <LocateFixed className="h-3.5 w-3.5" />
              {formatDistanceKm(distanceKm)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-zik-muted">
          <span className="flex items-center gap-1">
            <Drum className="h-3.5 w-3.5" />
            {jam.has_drums ? "Avec batterie" : "Sans batterie"}
          </span>
          <span className="flex items-center gap-1">
            <Piano className="h-3.5 w-3.5" />
            {jam.has_keyboard ? "Avec clavier" : "Sans clavier"}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end mt-3">
        <div className="flex items-center gap-1.5">
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
