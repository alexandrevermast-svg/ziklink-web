"use client";

import Modal from "@/components/Modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StageNamePromptModalProps {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export default function StageNamePromptModal({
  open, value, onChange, onSubmit, onCancel, isSaving,
}: StageNamePromptModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Comment veux-tu qu'on t'appelle ?"
      description="Les autres participants verront ce nom pendant la jam — plus simple qu'un pseudo en vrai."
    >
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="flex flex-col gap-4">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex: Marie, ou ton nom de scène"
          maxLength={40}
          autoFocus
          className="bg-zik-bg border-zik-border text-zik-text placeholder:text-zik-muted focus:ring-zik-grad-to/50"
        />
        <Button
          type="submit"
          disabled={isSaving || !value.trim()}
          className="bg-linear-to-br from-zik-grad-from to-zik-grad-to hover:brightness-110 border-0"
        >
          {isSaving ? "Enregistrement..." : "Valider et rejoindre"}
        </Button>
      </form>
    </Modal>
  );
}
