import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Mail, Loader2 } from "lucide-react";
import { MemberAvatar } from "./MemberAvatar";
import type { Message, Profile } from "../types";

interface ChatTabProps {
  conversationId: string | null;
  isMember: boolean;
  isAdmin: boolean;
  isPendingMember: boolean;
  currentUserId: string | null;
  messages: Message[];
  messageInput: string;
  onMessageInputChange: (v: string) => void;
  isSending: boolean;
  onSendMessage: (e: React.FormEvent) => void;
  onAvatarClick: (profile: Profile, e: React.MouseEvent<HTMLDivElement>) => void;
  onContactGroup: () => void;
  isContactingGroup: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function ChatTab({
  conversationId, isMember, isAdmin, isPendingMember, currentUserId,
  messages, messageInput, onMessageInputChange, isSending, onSendMessage,
  onAvatarClick, onContactGroup, isContactingGroup, messagesEndRef,
}: ChatTabProps) {
  return (
    <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden px-0 py-0 min-h-100">
      {!conversationId ? (
        <div className="flex-1 flex items-center justify-center text-sm text-zik-muted p-4">
          Le chat sera disponible prochainement.
        </div>
      ) : !isMember && !isAdmin ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-zik-muted p-4 text-center">
          <p>Ce chat est réservé aux membres du groupe 💬</p>
          {currentUserId && !isPendingMember && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-zik-border text-zik-text hover:bg-zik-card-hover"
              onClick={onContactGroup}
              disabled={isContactingGroup}
            >
              {isContactingGroup ?
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Ouverture...</> :
                <><Mail className="h-3.5 w-3.5 mr-1.5" /> Contacter le groupe</>
              }
            </Button>
          )}
          {isPendingMember && (
            <span className="text-xs text-zik-orange font-medium">
              ⏳ Demande en attente d'approbation
            </span>
          )}
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-zik-muted text-center py-8">
                Pas encore de messages — lancez la discussion ! 🎸
              </p>
            ) : messages.map((msg) => {
              const isMe = msg.user_id === currentUserId;
              return (
                <div key={msg.id} className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  {!isMe && <MemberAvatar profile={msg.profile} size="sm" onClick={(e) => msg.profile && onAvatarClick(msg.profile, e)} />}
                  <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <span className="text-xs text-zik-muted ml-0.5">
                        {msg.profile?.username ?? 'Inconnu'}
                      </span>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm ${
                      isMe
                        ? 'bg-zik-purple text-white rounded-tr-sm'
                        : 'bg-zik-card/80 text-zik-text rounded-tl-sm border border-zik-border'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-zik-muted mx-1">
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={onSendMessage} className="border-t border-zik-border px-4 py-3 flex gap-2 items-center shrink-0">
            <Input
              value={messageInput}
              onChange={(e) => onMessageInputChange(e.target.value)}
              placeholder="Envoyer un message..."
              className="flex-1 text-sm bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
              disabled={isSending}
            />
            <Button
              type="submit"
              size="sm"
              className="bg-zik-purple hover:bg-zik-indigo shrink-0 disabled:opacity-50"
              disabled={!messageInput.trim() || isSending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </>
      )}
    </TabsContent>
  );
}
