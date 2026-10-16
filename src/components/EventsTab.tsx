"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Users, Mic2 } from "lucide-react";
import JamCreationForm from "@/components/JamCreationForm";
import JamList from "@/components/JamList";
import ConcertCreationForm from "@/components/ConcertCreationForm";
import ConcertList from "@/components/ConcertList";
import Modal from "@/components/Modal";
import type { JamSession, Concert } from "@/types";
import type { ParticipantWithProfile } from "@/app/(public)/events/page";

interface EventsTabProps {
  initialJams?: JamSession[];
  initialParticipantsMap?: Record<string, ParticipantWithProfile[]>;
  initialConcerts?: Concert[];
}

export default function EventsTab({ initialJams, initialParticipantsMap, initialConcerts }: EventsTabProps = {}) {
  const router = useRouter();
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"jams" | "concerts">("jams");
  const [isJamModalOpen, setIsJamModalOpen] = React.useState(false);
  const [isConcertModalOpen, setIsConcertModalOpen] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const requireAuth = (openModal: () => void) => {
    if (!currentUserId) {
      router.push(`/login?next=${encodeURIComponent("/events")}`);
      return;
    }
    openModal();
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "jams" | "concerts")} className="w-full">
      {/* Toggle Jams / Concerts — pill segmentée, distincte du CTA d'ajout */}
      <TabsList className="grid w-full grid-cols-2 bg-white/4 backdrop-blur-md p-1 rounded-full border border-white/8">
        <TabsTrigger
          value="jams"
          className="text-gray-400 data-[state=active]:bg-linear-to-br data-[state=active]:from-zik-grad-from data-[state=active]:to-zik-grad-to data-[state=active]:text-white data-[state=active]:shadow-[0_0_16px_-4px_rgba(168,85,247,0.6)] rounded-full transition-all"
        >
          <Users className="mr-2 h-4 w-4" />
          Jams
        </TabsTrigger>
        <TabsTrigger
          value="concerts"
          className="text-gray-400 data-[state=active]:bg-linear-to-br data-[state=active]:from-zik-grad-from data-[state=active]:to-zik-grad-to data-[state=active]:text-white data-[state=active]:shadow-[0_0_16px_-4px_rgba(168,85,247,0.6)] rounded-full transition-all"
        >
          <Mic2 className="mr-2 h-4 w-4" />
          Concerts
        </TabsTrigger>
      </TabsList>

      {/* Onglet Jams */}
      <TabsContent value="jams">
        <div className="flex flex-col gap-4 pt-4 px-4">
          <JamList initialJams={initialJams} initialParticipantsMap={initialParticipantsMap} />
        </div>
      </TabsContent>

      {/* Onglet Concerts */}
      <TabsContent value="concerts">
        <div className="flex flex-col gap-4 pt-4 px-4">
          <ConcertList initialConcerts={initialConcerts} />
        </div>
      </TabsContent>

      {/* CTA d'ajout — bouton flottant, détaché du header pour ne pas se
          confondre avec le toggle d'onglets ; au-dessus de la bottom nav. */}
      <button
        onClick={() => requireAuth(() => activeTab === "jams" ? setIsJamModalOpen(true) : setIsConcertModalOpen(true))}
        title={activeTab === "jams" ? "Ajouter une jam" : "Ajouter un concert"}
        className="fixed right-4 z-40 h-14 w-14 rounded-full bg-linear-to-br from-zik-grad-from to-zik-grad-to text-white flex items-center justify-center hover:brightness-110 active:scale-95 transition-all"
        style={{
          bottom: "calc(5rem + env(safe-area-inset-bottom))",
          boxShadow: "0 8px 24px -4px rgba(124,58,237,0.5), 0 0 16px -2px rgba(168,85,247,0.5)",
        }}
      >
        <Plus className="h-6 w-6" />
      </button>

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
