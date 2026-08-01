import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/events", "/events/", "/services", "/legal"],
        // Le reste exige une session connectée (redirige vers /login) :
        // inutile et contre-productif de le laisser explorer par les robots.
        disallow: [
          "/admin",
          "/groups",
          "/groups/",
          "/messages",
          "/messages/",
          "/profile",
          "/profile/",
          "/onboarding",
          "/auth/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
