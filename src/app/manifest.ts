import type { MetadataRoute } from "next";

/**
 * PWA manifest. Next serves this at /manifest.webmanifest and injects the
 * <link rel="manifest"> automatically. Makes the app installable on mobile.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ravindra Bhavan Sankhali",
    short_name: "Ravindra Bhavan",
    description:
      "Events, workshops, cultural classes, venue booking, canteen and community.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6d28d9",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
