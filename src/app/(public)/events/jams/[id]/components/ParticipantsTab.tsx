import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, ShieldCheck } from "lucide-react";
import { Avatar } from "./Avatar";
import type { Participant, Profile } from "../types";

interface ParticipantsTabProps {
  isOrganizer: boolean;
  isMainOrganizer: boolean;
  currentUserId: string | null;
  jamCreatedBy: string | null;
  pendingParticipants: Participant[];
  confirmedParticipants: Participant[];
  onAvatarClick: (profile: Profile, e: React.MouseEvent) => void;
  onAccept: (userId: string) => void;
  onReject: (userId: string) => void;
  onToggleCoOrganizer: (userId: string, currentIsOrganizer: boolean) => void;
}

export function ParticipantsTab({
  isOrganizer, isMainOrganizer, currentUserId, jamCreatedBy,
  pendingParticipants, confirmedParticipants,
  onAvatarClick, onAccept, onReject, onToggleCoOrganizer,
}: ParticipantsTabProps) {
  return (
    <TabsContent value="participants" className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
      {isOrganizer && pendingParticipants.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-zik-orange uppercase tracking-wide mb-2">
            En attente · {pendingParticipants.length}
          </p>
          <div className="space-y-2">
            {pendingParticipants.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-zik-orange/10 border border-zik-orange/20">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar profile={p.profile} onClick={p.profile && p.user_id !== currentUserId ? (e) => onAvatarClick(p.profile!, e) : undefined} />
                  <span className="text-sm font-medium text-zik-text truncate">{p.profile?.username ?? "Inconnu"}</span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" className="h-7 text-xs bg-zik-emerald hover:bg-zik-emerald/80 px-2" onClick={() => onAccept(p.user_id)}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-zik-red/30 text-zik-red hover:bg-zik-red/10 px-2" onClick={() => onReject(p.user_id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-semibold text-zik-muted uppercase tracking-wide mb-2">
          Confirmés · {confirmedParticipants.length}
        </p>
        {confirmedParticipants.length === 0 ? (
          <p className="text-sm text-zik-muted text-center py-4">Aucun participant pour l'instant</p>
        ) : (
          <div className="space-y-2">
            {confirmedParticipants.map((p) => {
              const isMainOrga = p.user_id === jamCreatedBy;
              const isCoOrga = p.is_organizer && !isMainOrga;
              return (
                <div key={p.user_id} className={`flex items-center gap-2.5 p-3 rounded-lg border ${
                  isCoOrga ? "bg-zik-purple/10 border-zik-purple/20" : "bg-zik-card/50 border-zik-border"
                }`}>
                  <Avatar profile={p.profile} onClick={p.profile && p.user_id !== currentUserId ? (e) => onAvatarClick(p.profile!, e) : undefined} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zik-text truncate">{p.profile?.username ?? "Inconnu"}</p>
                    {isMainOrga && <p className="text-xs text-zik-indigo flex items-center gap-1"><Crown className="h-3 w-3" /> Organisateur</p>}
                    {isCoOrga && <p className="text-xs text-zik-purple flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Co-organisateur</p>}
                  </div>
                  {isMainOrganizer && p.user_id !== currentUserId && (
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="sm" variant="outline"
                        title={isCoOrga ? "Révoquer" : "Nommer co-organisateur"}
                        className={`h-7 w-7 p-0 shrink-0 transition-colors ${
                          isCoOrga
                            ? "border-zik-purple/30 text-zik-purple hover:bg-zik-purple/10"
                            : "border-zik-border text-zik-muted hover:border-zik-purple/30 hover:text-zik-purple hover:bg-zik-purple/10"
                        }`}
                        onClick={() => onToggleCoOrganizer(p.user_id, p.is_organizer)}>
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-zik-muted hover:text-zik-red hover:bg-zik-red/10 shrink-0"
                        onClick={() => onReject(p.user_id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TabsContent>
  );
}
