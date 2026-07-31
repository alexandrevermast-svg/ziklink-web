import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, ShieldCheck, MessageCircle } from "lucide-react";
import { MemberAvatar } from "./MemberAvatar";
import type { GroupMember, Profile } from "../types";

interface MembersTabProps {
  isAdmin: boolean;
  currentUserId: string | null;
  groupCreatedBy: string | null;
  pendingMembers: GroupMember[];
  confirmedMembers: GroupMember[];
  onAvatarClick: (profile: Profile, e: React.MouseEvent<HTMLDivElement>) => void;
  onApprove: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
  onToggleAdmin: (userId: string, currentRole: string) => void;
  onOpenDM: (userId: string) => void;
}

export function MembersTab({
  isAdmin, currentUserId, groupCreatedBy, pendingMembers, confirmedMembers,
  onAvatarClick, onApprove, onRemoveMember, onToggleAdmin, onOpenDM,
}: MembersTabProps) {
  return (
    <TabsContent value="members" className="px-4 py-3 space-y-2">
      {isAdmin && pendingMembers.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-zik-orange uppercase tracking-wide mb-2">
            En attente · {pendingMembers.length}
          </p>
          <div className="space-y-2">
            {pendingMembers.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between gap-2 p-3 rounded-lg bg-zik-orange/10 border border-zik-orange/20"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MemberAvatar
                    profile={m.profile}
                    onClick={(e) => m.profile && onAvatarClick(m.profile, e)}
                  />
                  <span className="text-sm font-medium text-zik-text truncate">
                    {m.profile?.username ?? 'Inconnu'}
                  </span>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-zik-emerald hover:bg-zik-emerald/80 px-2"
                    onClick={() => onApprove(m.user_id)}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-zik-red/30 text-zik-red hover:bg-zik-red/10 px-2"
                    onClick={() => onRemoveMember(m.user_id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmedMembers.length === 0 ? (
        <p className="text-sm text-zik-muted text-center py-6">Aucun membre pour l'instant</p>
      ) : confirmedMembers.map((m) => {
        const isCreator = m.user_id === groupCreatedBy;
        const isAdminMember = m.role === 'admin';
        return (
          <div
            key={m.user_id}
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              isAdminMember
                ? 'bg-zik-purple/10 border-zik-purple/20'
                : 'bg-zik-card/50 border-zik-border'
            }`}
          >
            <MemberAvatar
              profile={m.profile}
              onClick={(e) => m.profile && onAvatarClick(m.profile, e)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zik-text truncate">
                {m.profile?.username ?? 'Inconnu'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isCreator && (
                  <span className="flex items-center gap-0.5 text-xs text-zik-indigo">
                    <Crown className="h-3 w-3" /> Créateur
                  </span>
                )}
                {isAdminMember && !isCreator && (
                  <span className="flex items-center gap-0.5 text-xs text-zik-purple">
                    <ShieldCheck className="h-3 w-3" /> Admin
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {m.user_id !== currentUserId && (
                <button
                  onClick={() => onOpenDM(m.user_id)}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-zik-muted hover:text-zik-purple hover:bg-zik-purple/10 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </button>
              )}
              {isAdmin && m.user_id !== currentUserId && !isCreator && (
                <>
                  <button
                    onClick={() => onToggleAdmin(m.user_id, m.role)}
                    className={`h-7 w-7 flex items-center justify-center rounded-full transition-colors ${
                      isAdminMember
                        ? 'text-zik-purple hover:bg-zik-purple/10'
                        : 'text-zik-muted hover:text-zik-purple hover:bg-zik-purple/10'
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onRemoveMember(m.user_id)}
                    className="h-7 w-7 flex items-center justify-center rounded-full text-zik-muted hover:text-zik-red hover:bg-zik-red/10 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </TabsContent>
  );
}
