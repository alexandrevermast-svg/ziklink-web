"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Users, Mic2, X } from "lucide-react";
import JamCreationForm from "@/components/JamCreationForm";
import JamList from "@/components/JamList";
import ConcertCreationForm from "@/components/ConcertCreationForm";
import ConcertList from "@/components/ConcertList";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Modal({ open, onClose, title, description, children }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }} aria-modal="true" role="dialog">
      {/* ✅ Remplace le fond blanc par ton thème */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(14, 11, 22, 0.8)" }} onClick={onClose} />
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "var(--zik-card)",  // ✅ Utilise ta variable CSS
        borderRadius: "12px",
        padding: "24px",
        width: "min(90vw, 640px)",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        color: "var(--zik-text)",  // ✅ Texte selon ton thème
      }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            {/* ✅ Remplace text-gray-900 par ta classe ou variable */}
            <h2 className="text-xl font-bold text-zik-text">{title}</h2>
            {description && <p className="text-sm text-zik-muted mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-1 rounded hover:bg-zik-card-hover text-zik-muted hover:text-zik-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

export default function EventsTab() {
  const [isJamModalOpen, setIsJamModalOpen] = React.useState(false);
  const [isConcertModalOpen, setIsConcertModalOpen] = React.useState(false);

  return (
    <Tabs defaultValue="jams" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="jams" className="text-zik-text">
          <Users className="mr-2 h-4 w-4" />
          Jams
        </TabsTrigger>
        <TabsTrigger value="concerts" className="text-zik-text">
          <Mic2 className="mr-2 h-4 w-4" />
          Concerts
        </TabsTrigger>
      </TabsList>

      {/* Onglet Jams */}
      <TabsContent value="jams">
        <div className="flex flex-col gap-4 pt-4 px-4">
          <div className="flex items-center justify-between">
            {/* ✅ Remplace text-gray-700 par text-zik-text */}
            <h2 className="text-base font-semibold text-zik-text">Jams à venir</h2>
            {/* ✅ Remplace bg-blue-600 par une classe personnalisée ou une variable */}
            <Button
              size="sm"
              className="bg-zik-purple hover:bg-zik-indigo text-white"
              onClick={() => setIsJamModalOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Ajouter une jam
            </Button>
          </div>
          <JamList />
        </div>
      </TabsContent>

      {/* Onglet Concerts */}
      <TabsContent value="concerts">
        <div className="flex flex-col gap-4 pt-4 px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zik-text">Concerts à venir</h2>
            <Button
              size="sm"
              className="bg-zik-purple hover:bg-zik-indigo text-white"
              onClick={() => setIsConcertModalOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Ajouter un concert
            </Button>
          </div>
          <ConcertList />
          </div>
        </TabsContent>

      <Modal
        open={isJamModalOpen}
        onClose={() => setIsJamModalOpen(false)}
        title="Créer une nouvelle jam"
        description="Remplissez le formulaire pour ajouter une nouvelle jam."
      >
        <JamCreationForm
          onSuccess={() => setIsJamModalOpen(false)}
          onClose={() => setIsJamModalOpen(false)}
        />
      </Modal>

      <Modal
        open={isConcertModalOpen}
        onClose={() => setIsConcertModalOpen(false)}
        title="Créer un concert"
        description="Remplissez le formulaire pour ajouter un concert."
      >
        <ConcertCreationForm
          onSuccess={() => setIsConcertModalOpen(false)}
          onClose={() => setIsConcertModalOpen(false)}
        />
      </Modal>
    </Tabs>
  );
}