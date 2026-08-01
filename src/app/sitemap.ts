import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: jams }, { data: concerts }] = await Promise.all([
    supabase.from("jam_sessions").select("id, start_time").gte("start_time", now),
    supabase.from("concerts").select("id, start_time").gte("start_time", now),
  ]);

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/events`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/services`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/legal`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.2,
    },
    ...(jams ?? []).map((jam) => ({
      url: `${SITE_URL}/events/jams/${jam.id}`,
      lastModified: new Date(jam.start_time),
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
    ...(concerts ?? []).map((concert) => ({
      url: `${SITE_URL}/events/concerts/${concert.id}`,
      lastModified: new Date(concert.start_time),
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
  ];
}
