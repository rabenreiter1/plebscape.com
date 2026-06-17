export const siteUrl = "https://plebscape.com";
export const siteName = "PLEBSCAPE.COM";
export const siteSlogan = "There is only one way to escape the pleb.";
export const siteDescription =
  "PLEBSCAPE is a free browser word game about voting against the crowd. Choose before seeing global percentages and survive only if your choice stays below 50%.";

export const publicSitePages = [
  {
    path: "/",
    title: siteName,
    description: siteDescription,
    priority: 1,
    changeFrequency: "weekly" as const
  },
  {
    path: "/how-it-works",
    title: "How PLEBSCAPE Works",
    description:
      "Learn the rules of PLEBSCAPE, including hidden votes, global percentages, score sharing, and the level 100 escape.",
    priority: 0.8,
    changeFrequency: "monthly" as const
  },
  {
    path: "/about",
    title: "About PLEBSCAPE",
    description:
      "PLEBSCAPE is a minimalist crowd-behavior browser game about choosing what the pleb did not.",
    priority: 0.7,
    changeFrequency: "monthly" as const
  },
  {
    path: "/press",
    title: "PLEBSCAPE Press Kit",
    description:
      "Short descriptions, brand lines, and share guidance for PLEBSCAPE.COM.",
    priority: 0.5,
    changeFrequency: "monthly" as const
  },
  {
    path: "/privacy",
    title: "PLEBSCAPE Privacy",
    description:
      "Privacy notes for PLEBSCAPE's anonymous global voting game.",
    priority: 0.4,
    changeFrequency: "yearly" as const
  }
];

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

