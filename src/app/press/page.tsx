import type { Metadata } from "next";

import { siteName, siteSlogan, siteUrl } from "@/lib/site";

import { breadcrumbJsonLd, ContentPage, JsonLdScript, pageJsonLd } from "../seo-content";

const title = "PLEBSCAPE Press Kit";
const description =
  "Short descriptions, brand lines, and share guidance for PLEBSCAPE.COM.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/press"
  }
};

export default function PressPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      pageJsonLd({ path: "/press", title, description }),
      breadcrumbJsonLd([
        { name: siteName, path: "/" },
        { name: title, path: "/press" }
      ])
    ]
  };

  return (
    <>
      <JsonLdScript data={structuredData} />
      <ContentPage title={title} description={description}>
        <section>
          <h2>Short description</h2>
          <p>
            PLEBSCAPE is a free browser word game where players vote on two words
            before seeing global percentages. A run survives only while the chosen
            word remains below 50%.
          </p>
        </section>

        <section>
          <h2>Brand lines</h2>
          <ul>
            <li>Domain: {siteUrl}</li>
            <li>Name: {siteName}</li>
            <li>Slogan: {siteSlogan}</li>
            <li>Category: free browser word game, social voting game</li>
          </ul>
        </section>

        <section>
          <h2>Share image</h2>
          <p>
            Failed and escaped runs can generate a square PNG with the terminal
            level, score, average choice, final word percentages, brand mark, and
            slogan.
          </p>
        </section>
      </ContentPage>
    </>
  );
}

