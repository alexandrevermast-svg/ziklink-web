"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Modal from "@/components/Modal";
import ServiceForm from "@/components/ServiceForm";
import ServiceList from "@/components/ServiceList";

export default function ServicesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUserId(user?.id ?? null));
  }, []);

  const handleAddClick = () => {
    if (!currentUserId) {
      router.push(`/login?next=${encodeURIComponent("/services")}`);
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 pt-4 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-zik-text">Services</h1>
          <p className="text-xs text-zik-muted mt-0.5">Cours de musique et prestations entre musiciens</p>
        </div>
        <Button size="sm" className="bg-zik-purple hover:bg-zik-indigo text-white" onClick={handleAddClick}>
          <Plus className="mr-1.5 h-4 w-4" /> Ajouter
        </Button>
      </div>

      <ServiceList key={refreshKey} />

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Publier une annonce"
        description="Cours de musique ou prestation musicale."
      >
        <ServiceForm
          onSuccess={() => { setIsModalOpen(false); setRefreshKey((k) => k + 1); }}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
