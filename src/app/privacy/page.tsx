import type { Metadata } from "next";

import { siteName } from "@/lib/site";

import { breadcrumbJsonLd, ContentPage, JsonLdScript, pageJsonLd } from "../seo-content";

const title = "PLEBSCAPE Privacy";
const description =
  "Privacy notes for PLEBSCAPE's anonymous global voting game.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/privacy"
  }
};

export default function PrivacyPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      pageJsonLd({ path: "/privacy", title, description }),
      breadcrumbJsonLd([
        { name: siteName, path: "/" },
        { name: title, path: "/privacy" }
      ])
    ]
  };

  return (
    <>
      <JsonLdScript data={structuredData} />
      <ContentPage title={title} description={description}>
        <section>
          <h2>Anonymous play</h2>
          <p>
            PLEBSCAPE does not use accounts, profiles, or logins. A run can be
            played immediately in the browser.
          </p>
        </section>

        <section>
          <h2>Votes</h2>
          <p>
            When you choose a button, that vote is stored in the global vote count
            for the level. Votes are used to calculate the revealed percentages and
            determine whether a choice survives.
          </p>
        </section>

        <section>
          <h2>Server logs</h2>
          <p>
            Like most websites, the hosting provider may create basic server logs
            for reliability, security, and debugging. PLEBSCAPE does not add
            analytics tracking unless that is introduced separately.
          </p>
        </section>
      </ContentPage>
    </>
  );
}

