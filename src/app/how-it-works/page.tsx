import type { Metadata } from "next";

import { siteName } from "@/lib/site";

import { breadcrumbJsonLd, ContentPage, JsonLdScript, pageJsonLd } from "../seo-content";

const title = "How PLEBSCAPE Works";
const description =
  "PLEBSCAPE is a free browser word game where you choose before seeing global vote percentages and survive only if your choice stays below 50%.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "/how-it-works"
  }
};

export default function HowItWorksPage() {
  const questions = [
    {
      question: "What is PLEBSCAPE?",
      answer:
        "PLEBSCAPE is a free browser word game about choosing against the crowd before you can see what the crowd chose."
    },
    {
      question: "How do you win PLEBSCAPE?",
      answer:
        "You keep surviving levels by choosing the word that remains below 50% after your own vote has been counted."
    },
    {
      question: "Why does 50% fail?",
      answer:
        "The game only lets a strict minority survive. If your chosen word reaches 50% or more, the run fails."
    },
    {
      question: "What happens at level 100?",
      answer:
        "Level 100 is the final level. Once your vote is counted there, the run ends with YOU ESCAPED."
    },
    {
      question: "Where does the score appear?",
      answer:
        "The score appears only inside the generated square share image, never during gameplay or on the normal result screen."
    }
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      pageJsonLd({ path: "/how-it-works", title, description }),
      breadcrumbJsonLd([
        { name: siteName, path: "/" },
        { name: title, path: "/how-it-works" }
      ]),
      {
        "@type": "FAQPage",
        "@id": "https://plebscape.com/how-it-works#faq",
        mainEntity: questions.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer
          }
        }))
      }
    ]
  };

  return (
    <>
      <JsonLdScript data={structuredData} />
      <ContentPage title={title} description={description}>
        <section>
          <h2>Rules</h2>
          <ol>
            <li>You are shown two buttons with one word each.</li>
            <li>You choose one button.</li>
            <li>Your vote is added to the global vote count for that level.</li>
            <li>The game reveals the percentages.</li>
            <li>You survive only if your chosen button has less than 50%.</li>
            <li>If your chosen button has 50% or more, you fail.</li>
          </ol>
        </section>

        <section>
          <h2>The 100-level world</h2>
          <p>
            PLEBSCAPE uses a fixed pool of 100 authored word-pair levels. Each run
            draws from that pool, scrambles the button order, and avoids repeating a
            level inside the same run.
          </p>
          <p>
            The server favors levels with the lowest total vote count, randomized
            among ties, so global votes stay balanced across the full world.
          </p>
        </section>

        <section>
          <h2>Score and sharing</h2>
          <p>
            The score is based first on the failed level reached and second on the
            average percentage of the choices made across the run. The score appears
            only inside the generated share image.
          </p>
          <p>
            The share image shows the terminal level, score, average choice, final
            percentages, final words, {siteName}, and the slogan.
          </p>
        </section>

        <section>
          <h2>Common questions</h2>
          {questions.map((item) => (
            <section className="content-faq" key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </section>
          ))}
        </section>
      </ContentPage>
    </>
  );
}

