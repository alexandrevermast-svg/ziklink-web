import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Link2, Plus, X } from "lucide-react";
import { GENRES } from "../types";
import { MAX_PROFILE_LINKS, type ProfileLink } from "@/lib/profileLinks";

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
  editLinks: ProfileLink[];
  onLinksChange: (v: ProfileLink[]) => void;
  isSaving: boolean;
  onSave: (e: React.FormEvent) => void;
}

export function EditGroupModal({
  open, onClose, editName, onNameChange, editBio, onBioChange,
  editCity, onCityChange, editGenre, onGenreChange,
  editLinks, onLinksChange, isSaving, onSave,
}: EditGroupModalProps) {
  const updateLink = (index: number, field: keyof ProfileLink, value: string) => {
    onLinksChange(editLinks.map((l, i) => i === index ? { ...l, [field]: value } : l));
  };
  const removeLink = (index: number) => {
    onLinksChange(editLinks.filter((_, i) => i !== index));
  };
  const addLink = () => {
    if (editLinks.length < MAX_PROFILE_LINKS) onLinksChange([...editLinks, { label: "", url: "" }]);
  };
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
            className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-grad-to/50"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zik-text mb-1 block">Description</label>
          <textarea
            value={editBio}
            onChange={(e) => onBioChange(e.target.value)}
            rows={3}
            maxLength={280}
            className="w-full border-zik-border rounded-lg px-3 py-2 text-sm resize-none outline-none bg-zik-card text-zik-text placeholder:text-zik-muted focus:ring-zik-grad-to/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-zik-text mb-1 block">Ville</label>
            <Input
              value={editCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="bg-zik-card border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-grad-to/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zik-text mb-1 block">Genre</label>
            <select
              value={editGenre}
              onChange={(e) => onGenreChange(e.target.value)}
              className="w-full border-zik-border rounded-md text-sm px-3 py-2 bg-zik-card text-zik-text focus:outline-none focus:ring-2 focus:ring-zik-grad-to"
            >
              <option value="">Aucun</option>
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-zik-text mb-1 flex items-center gap-1.5">
            <Link2 className="h-3.5 w-3.5 text-zik-grad-to" /> Liens ({editLinks.length}/{MAX_PROFILE_LINKS})
          </label>
          <div className="space-y-2">
            {editLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={link.label}
                  onChange={(e) => updateLink(i, "label", e.target.value)}
                  placeholder="Instagram, site..."
                  className="w-28 shrink-0 border-zik-border rounded-lg px-2.5 py-2 text-sm outline-none bg-zik-card text-zik-text placeholder:text-zik-muted focus:ring-zik-grad-to/50"
                />
                <input
                  value={link.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder="https://..."
                  className="flex-1 min-w-0 border-zik-border rounded-lg px-2.5 py-2 text-sm outline-none bg-zik-card text-zik-text placeholder:text-zik-muted focus:ring-zik-grad-to/50"
                />
                <button type="button" onClick={() => removeLink(i)}
                  className="shrink-0 p-2 rounded-lg text-zik-muted hover:text-zik-red transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {editLinks.length < MAX_PROFILE_LINKS && (
              <button type="button" onClick={addLink}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-zik-grad-to/10 text-zik-grad-to hover:bg-zik-grad-to/20 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Ajouter un lien
              </button>
            )}
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
            className="bg-linear-to-br from-zik-grad-from to-zik-grad-to hover:brightness-110 border-0 disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement...</> : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
