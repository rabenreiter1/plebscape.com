import type { ReactNode } from "react";

import { absoluteUrl, siteName, siteSlogan } from "@/lib/site";

type JsonLd = Record<string, unknown>;

export function JsonLdScript({ data }: { data: JsonLd }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c")
      }}
    />
  );
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function ContentPage({
  children,
  description,
  title
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <main className="content-shell">
      <article className="content-page">
        <header className="content-hero">
          <a className="content-brand" href="/" aria-label="Play PLEBSCAPE">
            {siteName}
          </a>
          <p>{siteSlogan}</p>
          <h1>{title}</h1>
          <p className="content-lede">{description}</p>
        </header>
        <div className="content-body">{children}</div>
        <footer className="content-footer">
          <a href="/">Play PLEBSCAPE</a>
          <a href="/how-it-works">How it works</a>
          <a href="/about">About</a>
          <a href="/privacy">Privacy</a>
        </footer>
      </article>
    </main>
  );
}

export function pageJsonLd({
  description,
  path,
  title,
  type = "WebPage"
}: {
  description: string;
  path: string;
  title: string;
  type?: "AboutPage" | "WebPage";
}) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    "@id": `${absoluteUrl(path)}#webpage`,
    url: absoluteUrl(path),
    name: title,
    description,
    isPartOf: {
      "@id": `${absoluteUrl("/")}#website`
    }
  };
}

