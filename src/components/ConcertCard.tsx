"use client";

import { useRouter } from "next/navigation";
import { Clock, MapPin, Music2, Ticket, Heart } from "lucide-react";
import ShareButton from "@/components/ShareButton";

export interface ConcertCardData {
  id: string;
  title: string;
  artist: string | null;
  start_time: string;
  end_at: string | null;
  location: string | null;
  genre: string | null;
  is_free: boolean | null;
  price: number | null;
  poster_url?: string | null;
}

interface ConcertCardProps {
  concert: ConcertCardData;
  isInterested: boolean;
  interestedCount: number;
  isToggling: boolean;
  onToggleInterest: (concertId: string, e: React.MouseEvent) => void;
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

export default function ConcertCard({ concert, isInterested, interestedCount, isToggling, onToggleInterest }: ConcertCardProps) {
  const router = useRouter();
  const address = getAddress(concert.location);

  return (
    <div
      onClick={() => router.push(`/events/concerts/${concert.id}`)}
      className="rounded-lg border border-zik-border overflow-hidden hover:border-zik-purple/30 hover:shadow-sm transition-all cursor-pointer active:scale-[0.99]"
    >
      <div className="flex">
        {concert.poster_url ? (
          <img src={concert.poster_url} alt={concert.title} className="w-24 shrink-0 object-cover self-stretch" />
        ) : (
          <div className="w-24 shrink-0 bg-linear-to-br from-zik-purple/20 to-zik-indigo/20 flex items-center justify-center">
            <Music2 className="h-8 w-8 text-zik-purple" />
          </div>
        )}
        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-zik-text truncate">{concert.title}</h3>
              {concert.artist && <p className="text-sm text-zik-purple font-medium truncate">{concert.artist}</p>}
            </div>
            {concert.genre && (
              <span className="shrink-0 text-[10px] font-medium bg-zik-purple/10 text-zik-purple px-2 py-0.5 rounded-full">
                {concert.genre}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2 text-sm text-zik-text">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-zik-muted" />
              {formatDate(concert.start_time)} · {formatTime(concert.start_time)}
              {concert.end_at && ` → ${formatTime(concert.end_at)}`}
            </span>
            {address && (
              <span className="flex items-center gap-1 truncate max-w-45">
                <MapPin className="h-3 w-3 shrink-0 text-zik-muted" />{address}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              concert.is_free ? "bg-zik-emerald/10 text-zik-emerald" : "bg-zik-orange/10 text-zik-orange"
            }`}>
              <Ticket className="h-3 w-3" />
              {concert.is_free ? "Gratuit" : concert.price ? `${concert.price} €` : "Payant"}
            </span>
            <div className="flex items-center gap-1.5">
              <ShareButton url={`/events/concerts/${concert.id}`} title={concert.title} text={concert.artist ?? undefined} />
              <button
                onClick={(e) => onToggleInterest(concert.id, e)}
                disabled={isToggling}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  isInterested
                    ? "bg-zik-red/10 border-zik-red/20 text-zik-red"
                    : "bg-zik-card border-zik-border text-zik-muted hover:border-zik-red/20 hover:text-zik-red"
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${isInterested ? "fill-zik-red" : ""}`} />
                {interestedCount > 0 && <span>{interestedCount}</span>}
                {isInterested ? "Intéressé" : "M'intéresse"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
