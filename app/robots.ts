import type { MetadataRoute } from "next";

import { UPDATE_SLUG } from "@/lib/progress";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: `/${UPDATE_SLUG}`,
    },
  };
}
