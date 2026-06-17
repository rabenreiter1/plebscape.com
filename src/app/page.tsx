import { PlebscapeGame } from "@/components/plebscape-game";
import { siteDescription, siteName, siteSlogan, siteUrl, absoluteUrl } from "@/lib/site";

import { JsonLdScript } from "./seo-content";

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        url: siteUrl,
        name: siteName,
        description: siteDescription,
        inLanguage: "en"
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: siteName,
        url: siteUrl,
        slogan: siteSlogan,
        logo: absoluteUrl("/ape.png")
      },
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}#webapp`,
        name: siteName,
        url: siteUrl,
        description: siteDescription,
        applicationCategory: "GameApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires a modern web browser with JavaScript enabled.",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD"
        },
        publisher: {
          "@id": `${siteUrl}#organization`
        }
      },
      {
        "@type": "VideoGame",
        "@id": `${siteUrl}#game`,
        name: siteName,
        url: siteUrl,
        description:
          "A 100-level browser word game where players choose before seeing global vote percentages and survive only while their chosen side remains below 50%.",
        genre: ["Word game", "Social voting game", "Browser game"],
        playMode: "SinglePlayer",
        numberOfPlayers: {
          "@type": "QuantitativeValue",
          minValue: 1
        },
        publisher: {
          "@id": `${siteUrl}#organization`
        }
      }
    ]
  };

  return (
    <>
      <JsonLdScript data={structuredData} />
      <PlebscapeGame />
    </>
  );
}
