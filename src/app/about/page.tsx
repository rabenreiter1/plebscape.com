import type { Metadata } from "next";

import { siteName, siteSlogan } from "@/lib/site";

import { breadcrumbJsonLd, ContentPage, JsonLdScript, pageJsonLd } from "../seo-content";

const title = "About PLEBSCAPE";
const description =
  "PLEBSCAPE is a minimalist crowd-behavior browser game about choosing what the pleb did not.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/about"
  }
};

export default function AboutPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      pageJsonLd({ path: "/about", title, description, type: "AboutPage" }),
      breadcrumbJsonLd([
        { name: siteName, path: "/" },
        { name: title, path: "/about" }
      ])
    ]
  };

  return (
    <>
      <JsonLdScript data={structuredData} />
      <ContentPage title={title} description={description}>
        <section>
          <h2>What is PLEBSCAPE?</h2>
          <p>
            PLEBSCAPE is a free browser word game where every answer becomes part
            of a global vote count. You choose before seeing the results, and you
            survive only if your choice stays below 50%.
          </p>
          <p>
            The game is anonymous, immediate, and deliberately stark. It is built
            around one question: can you choose what the crowd did not?
          </p>
        </section>

        <section>
          <h2>What does pleb mean?</h2>
          <p>
            In PLEBSCAPE, a pleb is an ordinary person who follows the crowd by
            default: someone ruled by mass taste, mass behavior, or low-agency
            thinking.
          </p>
          <p>
            The slogan is "{siteSlogan}" The game turns that line into a rule:
            escape by avoiding the majority.
          </p>
        </section>

        <section>
          <h2>Why crowd behavior?</h2>
          <p>
            PLEBSCAPE uses simple word pairs to make social instinct visible. The
            buttons look equal, but the global vote history makes one side safer
            than the other only after enough people have answered.
          </p>
        </section>
      </ContentPage>
    </>
  );
}
