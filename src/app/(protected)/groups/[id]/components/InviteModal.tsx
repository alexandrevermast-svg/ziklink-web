import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

type InviteResult = 'idle' | 'loading' | 'success' | 'notfound' | 'already';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  inviteUsername: string;
  onUsernameChange: (v: string) => void;
  inviteResult: InviteResult;
  onInvite: (e: React.FormEvent) => void;
}

export function InviteModal({ open, onClose, inviteUsername, onUsernameChange, inviteResult, onInvite }: InviteModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Inviter un musicien">
      <form onSubmit={onInvite} className="space-y-4">
        <p className="text-sm text-zik-muted">Renseigne le nom d'utilisateur du musicien à inviter dans le groupe.</p>
        <div className="flex gap-2">
          <Input
            value={inviteUsername}
            onChange={(e) => onUsernameChange(e.target.value)}
            placeholder="Nom d'utilisateur exact"
            className="flex-1 bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
          />
          <Button
            type="submit"
            className="bg-zik-purple hover:bg-zik-indigo shrink-0 disabled:opacity-50"
            disabled={inviteResult === 'loading'}
          >
            {inviteResult === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Inviter'}
          </Button>
        </div>
        {inviteResult === 'success' && (
          <p className="text-sm text-zik-emerald font-medium">✓ Musicien ajouté au groupe !</p>
        )}
        {inviteResult === 'notfound' && (
          <p className="text-sm text-zik-red">Aucun utilisateur trouvé avec ce nom.</p>
        )}
        {inviteResult === 'already' && (
          <p className="text-sm text-zik-orange">Ce musicien est déjà dans le groupe.</p>
        )}
      </form>
    </Modal>
  );
}
