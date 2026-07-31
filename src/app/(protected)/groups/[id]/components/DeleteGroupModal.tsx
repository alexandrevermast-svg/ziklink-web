import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";

interface DeleteGroupModalProps {
  open: boolean;
  onClose: () => void;
  isDeleting: boolean;
  deleteError: string | null;
  onConfirm: () => void;
}

export function DeleteGroupModal({ open, onClose, isDeleting, deleteError, onConfirm }: DeleteGroupModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Supprimer le groupe ?">
      <p className="text-sm text-zik-muted mb-4">
        Cette action est irréversible. Tous les participants, événements et messages seront définitivement supprimés.
      </p>
      {deleteError && <p className="text-zik-red text-sm mb-4">{deleteError}</p>}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isDeleting}
          className="border-zik-border text-zik-text hover:bg-zik-card-hover"
        >
          Annuler
        </Button>
        <Button
          className="bg-zik-red hover:bg-zik-red/80 disabled:opacity-50"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? "Suppression..." : "Supprimer définitivement"}
        </Button>
      </div>
    </Modal>
  );
}
