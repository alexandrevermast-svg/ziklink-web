import { useRouter } from "next/navigation";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronRight } from "lucide-react";
import { formatDate } from "../utils";

interface GroupEvent {
  type: 'jam' | 'concert';
  id: string;
  title: string;
  artist?: string | null;
  start_time: string;
}

export function GroupEventsTab({ events, isMember }: { events: GroupEvent[]; isMember: boolean }) {
  const router = useRouter();

  return (
    <TabsContent value="events" className="px-4 py-3">
      {events.length === 0 ? (
        <div className="text-center py-8">
          <CalendarDays className="h-10 w-10 text-zik-muted mx-auto mb-3" />
          <p className="text-sm text-zik-muted mb-3">Aucun événement organisé par ce groupe</p>
          {isMember && (
            <div className="flex gap-2 justify-center flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-zik-border text-zik-text hover:bg-zik-card-hover"
                onClick={() => router.push('/events')}
              >
                🎸 Organiser une jam
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-zik-border text-zik-text hover:bg-zik-card-hover"
                onClick={() => router.push('/events')}
              >
                🎤 Ajouter un concert
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <button
              key={`${event.type}-${event.id}`}
              onClick={() => router.push(`/events/${event.type === 'jam' ? 'jams' : 'concerts'}/${event.id}`)}
              className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-all text-left ${
                event.type === 'jam'
                  ? 'bg-zik-card/50 border-zik-border hover:border-zik-purple/30 hover:bg-zik-purple/5'
                  : 'bg-zik-card/50 border-zik-border hover:border-zik-red/30 hover:bg-zik-red/5'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base shrink-0">{event.type === 'jam' ? '🎸' : '🎤'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zik-text truncate">{event.title}</p>
                  {event.type === 'concert' && event.artist && (
                    <p className="text-xs text-zik-purple font-medium truncate">{event.artist}</p>
                  )}
                  <p className="text-xs text-zik-muted">{formatDate(event.start_time)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  event.type === 'jam'
                    ? 'bg-zik-emerald/10 text-zik-emerald'
                    : 'bg-zik-red/10 text-zik-red'
                }`}>
                  {event.type === 'jam' ? 'Jam' : 'Concert'}
                </span>
                <ChevronRight className="h-4 w-4 text-zik-muted" />
              </div>
            </button>
          ))}
        </div>
      )}
    </TabsContent>
  );
}
