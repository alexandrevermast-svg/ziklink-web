import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Seule la page d'accueil est publique et a un vrai contenu à indexer :
// tout le reste (jams, concerts, groupes...) est derrière l'authentification.
// À étendre le jour où des pages de détail deviennent consultables sans compte.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
  ];
}
