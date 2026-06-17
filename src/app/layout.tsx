import type { Metadata, Viewport } from "next";

import { absoluteUrl, siteDescription, siteName, siteUrl } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | Free Minority Vote Browser Game`,
    template: `%s | ${siteName}`
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  keywords: [
    "PLEBSCAPE",
    "free browser game",
    "word game",
    "social voting game",
    "minority game",
    "vote against the crowd",
    "online game"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName,
    title: `${siteName} | Free Minority Vote Browser Game`,
    description: siteDescription,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${siteName} social preview`
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Free Minority Vote Browser Game`,
    description: siteDescription,
    images: [absoluteUrl("/opengraph-image")]
  },
  icons: {
    icon: "/ape.png",
    shortcut: "/ape.png",
    apple: "/ape.png"
  },
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0b"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
