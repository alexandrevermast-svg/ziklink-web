"use client";

import { useRouter } from "next/navigation";
import { Clock, MapPin, Music2, Ticket, Heart } from "lucide-react";
import ShareButton from "@/components/ShareButton";
import { genreColor } from "@/lib/musicGenres";
import { getAddressParts } from "@/lib/eventLocation";

export interface ConcertCardData {
  id: string;
  title: string;
  artist: string | null;
  start_time: string;
  end_at: string | null;
  location: string | null;
  genres: string[] | null;
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
export default function ConcertCard({ concert, isInterested, interestedCount, isToggling, onToggleInterest }: ConcertCardProps) {
  const router = useRouter();
  const addressParts = getAddressParts(concert.location);

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
              <h3 className="text-lg font-semibold text-[#FFC857] truncate">{concert.title}</h3>
              {concert.artist && <p className="text-sm text-zik-purple font-medium truncate">{concert.artist}</p>}
            </div>
          </div>

          {concert.genres && concert.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {concert.genres.map((g) => (
                <span key={g}
                  className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${genreColor(g)}1A`, color: genreColor(g) }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-2 text-sm text-zik-text">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-zik-muted" />
              {formatDate(concert.start_time)} · {formatTime(concert.start_time)}
              {concert.end_at && ` → ${formatTime(concert.end_at)}`}
            </span>
          </div>
          {addressParts && (addressParts.name || addressParts.detail) && (
            <div className="flex items-start gap-1.5 mt-1">
              <MapPin className="h-3 w-3 shrink-0 text-zik-muted mt-0.5" />
              <span className="min-w-0 leading-tight">
                {addressParts.name && <span className="block text-sm text-zik-text">{addressParts.name}</span>}
                {addressParts.detail && (
                  <span className={`block line-clamp-2 ${addressParts.name ? "text-xs text-zik-muted mt-0.5" : "text-sm text-zik-text"}`}>
                    {addressParts.detail}
                  </span>
                )}
              </span>
            </div>
          )}
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
