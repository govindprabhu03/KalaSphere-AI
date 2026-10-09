import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/o/"], disallow: ["/dashboard", "/api/", "/onboarding"] }],
    host: env.siteUrl,
  };
}
