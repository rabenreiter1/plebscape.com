import type { MetadataRoute } from "next";

import { siteDescription, siteName, siteSlogan } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: "PLEBSCAPE",
    description: siteDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f1e8",
    theme_color: "#0b0b0b",
    categories: ["games", "entertainment", "word"],
    icons: [
      {
        src: "/ape.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/ape.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    shortcuts: [
      {
        name: "Play",
        short_name: "Play",
        description: siteSlogan,
        url: "/"
      }
    ]
  };
}

