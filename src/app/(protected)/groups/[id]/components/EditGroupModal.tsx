import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { GENRES } from "../types";

interface EditGroupModalProps {
  open: boolean;
  onClose: () => void;
  editName: string;
  onNameChange: (v: string) => void;
  editBio: string;
  onBioChange: (v: string) => void;
  editCity: string;
  onCityChange: (v: string) => void;
  editGenre: string;
  onGenreChange: (v: string) => void;
  isSaving: boolean;
  onSave: (e: React.FormEvent) => void;
}

export function EditGroupModal({
  open, onClose, editName, onNameChange, editBio, onBioChange,
  editCity, onCityChange, editGenre, onGenreChange, isSaving, onSave,
}: EditGroupModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Modifier le groupe">
      <form onSubmit={onSave} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zik-text mb-1 block">
            Nom <span className="text-zik-red">*</span>
          </label>
          <Input
            value={editName}
            onChange={(e) => onNameChange(e.target.value)}
            required
            className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zik-text mb-1 block">Description</label>
          <textarea
            value={editBio}
            onChange={(e) => onBioChange(e.target.value)}
            rows={3}
            maxLength={280}
            className="w-full border-zik-border rounded-lg px-3 py-2 text-sm resize-none outline-none bg-zik-card text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-zik-text mb-1 block">Ville</label>
            <Input
              value={editCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-purple/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zik-text mb-1 block">Genre</label>
            <select
              value={editGenre}
              onChange={(e) => onGenreChange(e.target.value)}
              className="w-full border-zik-border rounded-md text-sm px-3 py-2 bg-zik-card text-zik-text focus:outline-none focus:ring-2 focus:ring-zik-purple"
            >
              <option value="">Aucun</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="border-zik-border text-zik-text hover:bg-zik-card-hover"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            className="bg-zik-purple hover:bg-zik-indigo disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</> : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
