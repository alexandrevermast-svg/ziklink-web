import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { Avatar } from "./Avatar";
import type { Message, Profile } from "../types";

interface ChatTabProps {
  conversationId: string | null;
  canInteract: boolean;
  messages: Message[];
  currentUserId: string | null;
  messageInput: string;
  onMessageInputChange: (v: string) => void;
  isSending: boolean;
  onSendMessage: (e: React.FormEvent) => void;
  onAvatarClick: (profile: Profile, e: React.MouseEvent) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function ChatTab({
  conversationId, canInteract, messages, currentUserId,
  messageInput, onMessageInputChange, isSending, onSendMessage, onAvatarClick, messagesEndRef,
}: ChatTabProps) {
  return (
    <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden px-0 py-0">
      {!conversationId ? (
        <div className="flex-1 flex items-center justify-center text-sm text-zik-muted p-4">
          Le chat sera disponible une fois la conversation créée.
        </div>
      ) : !canInteract ? (
        <div className="flex-1 flex items-center justify-center text-sm text-zik-muted p-4 text-center">
          Rejoins la jam pour accéder au chat 🎸
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 ? (
              <p className="text-sm text-zik-muted text-center py-8">Pas encore de messages — soyez les premiers ! 🎵</p>
            ) : messages.map((msg) => {
              const isMe = msg.user_id === currentUserId;
              return (
                <div key={msg.id} className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : ""}`}>
                  {!isMe && <Avatar profile={msg.profile} size="sm"
                    onClick={msg.profile ? (e) => onAvatarClick(msg.profile!, e) : undefined} />}
                  <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                    {!isMe && (
                      <span className="text-xs text-zik-muted ml-0.5">{msg.profile?.username ?? "Inconnu"}</span>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm ${
                      isMe
                        ? "bg-zik-purple text-white rounded-tr-sm"
                        : "bg-zik-card/80 text-zik-text rounded-tl-sm border border-zik-border"
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-zik-muted mx-1">
                      {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={onSendMessage} className="border-t border-zik-border px-4 py-3 flex gap-2 items-center shrink-0">
            <Input value={messageInput} onChange={(e) => onMessageInputChange(e.target.value)}
              placeholder="Envoyer un message..."
              className="flex-1 text-sm bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
              disabled={isSending} />
            <Button type="submit" size="sm" className="bg-zik-purple hover:bg-zik-indigo shrink-0 disabled:opacity-50"
              disabled={!messageInput.trim() || isSending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </>
      )}
    </TabsContent>
  );
}
