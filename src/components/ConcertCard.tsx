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
      className="rounded-2xl border border-white/8 bg-white/4 backdrop-blur-md overflow-hidden hover:bg-white/6 hover:border-white/14 transition-all cursor-pointer active:scale-[0.99]"
    >
      <div className="flex">
        {concert.poster_url ? (
          <img src={concert.poster_url} alt={concert.title} className="w-24 shrink-0 object-cover self-stretch" />
        ) : (
          <div className="w-24 shrink-0 bg-linear-to-br from-zik-grad-from/20 to-zik-grad-to/20 flex items-center justify-center">
            <Music2 className="h-8 w-8 text-zik-grad-to" />
          </div>
        )}
        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-white truncate">{concert.title}</h3>
              {concert.artist && <p className="text-sm text-zik-grad-to font-medium truncate">{concert.artist}</p>}
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
          <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(concert.start_time)} · {formatTime(concert.start_time)}
              {concert.end_at && ` → ${formatTime(concert.end_at)}`}
            </span>
          </div>
          {addressParts && (addressParts.name || addressParts.detail) && (
            <div className="flex items-start gap-1.5 mt-1">
              <MapPin className="h-3 w-3 shrink-0 text-gray-400 mt-0.5" />
              <span className="min-w-0 leading-tight">
                {addressParts.name && <span className="block text-sm text-gray-300">{addressParts.name}</span>}
                {addressParts.detail && (
                  <span className={`block line-clamp-2 text-gray-500 ${addressParts.name ? "text-xs mt-0.5" : "text-sm"}`}>
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
              <ShareButton
                url={`/events/concerts/${concert.id}`}
                title={concert.title}
                text={concert.artist ?? undefined}
                className="h-7 w-7 flex items-center justify-center rounded-full text-gray-400 hover:text-zik-grad-to hover:bg-white/8 transition-colors"
              />
              <button
                onClick={(e) => onToggleInterest(concert.id, e)}
                disabled={isToggling}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  isInterested
                    ? "bg-zik-red/10 border-zik-red/20 text-zik-red"
                    : "bg-white/5 border-white/10 text-gray-400 hover:border-zik-red/30 hover:text-zik-red"
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
