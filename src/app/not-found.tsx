import { ContentPage } from "./seo-content";

export default function NotFound() {
  return (
    <ContentPage
      title="Page not found"
      description="This PLEBSCAPE page does not exist, but the game is still waiting."
    >
      <section>
        <h2>Back to the game</h2>
        <p>
          PLEBSCAPE lives at the homepage. Start a fresh run, choose before seeing the
          crowd, and try to stay below 50%.
        </p>
      </section>
    </ContentPage>
  );
}

