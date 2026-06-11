"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { displayPercent, type LevelPublic, type RevealedResult, type Side } from "@/lib/game";

type GameState = "loading" | "choosing" | "submitting" | "revealed" | "failed" | "exhausted" | "error";
type DisplayChoice = {
  side: Side;
  noun: string;
};

const slogan = "There is only one way to escape the pleb.";
const apeImageSrc = "/ape-game.png";
const revealDelayMs = 2000;

export function PlebscapeGame() {
  const [state, setState] = useState<GameState>("loading");
  const [level, setLevel] = useState<LevelPublic | null>(null);
  const [choices, setChoices] = useState<DisplayChoice[]>([]);
  const [seenLevelIds, setSeenLevelIds] = useState<string[]>([]);
  const [runLevel, setRunLevel] = useState(1);
  const [result, setResult] = useState<RevealedResult | null>(null);
  const [chosenSide, setChosenSide] = useState<Side | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  const loadNextLevel = useCallback(
    async (nextSeenLevelIds = seenLevelIds) => {
      setState("loading");
      setResult(null);
      setChosenSide(null);
      setError(null);

      try {
        const response = await fetch("/api/levels/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seenLevelIds: nextSeenLevelIds })
        });

        if (!response.ok) {
          throw new Error("Could not load the next level.");
        }

        const data = (await response.json()) as { exhausted?: boolean; level?: LevelPublic };

        if (data.exhausted) {
          setLevel(null);
          setChoices([]);
          setState("exhausted");
          return;
        }

        if (!data.level) {
          throw new Error("Could not load the next level.");
        }

        const nextLevel = data.level;
        const orderedChoices: DisplayChoice[] =
          Math.random() > 0.5
            ? [
                { side: "a", noun: nextLevel.nounA },
                { side: "b", noun: nextLevel.nounB }
              ]
            : [
                { side: "b", noun: nextLevel.nounB },
                { side: "a", noun: nextLevel.nounA }
              ];

        setLevel(nextLevel);
        setChoices(orderedChoices);
        setState("choosing");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Something broke.");
        setState("error");
      }
    },
    [seenLevelIds]
  );

  useEffect(() => {
    void loadNextLevel([]);
  }, []);

  const choose = async (side: Side) => {
    if (!level || state !== "choosing") {
      return;
    }

    setChosenSide(side);
    setState("submitting");
    setError(null);

    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levelId: level.id, chosenSide: side })
      });

      if (!response.ok) {
        throw new Error("Your vote could not be counted.");
      }

      const data = (await response.json()) as { result: RevealedResult };
      const nextResult = data.result;
      setResult(nextResult);
      setChosenSide(nextResult.chosenSide);

      if (!nextResult.passed) {
        setState("failed");
        return;
      }

      setState("revealed");
      const nextSeenLevelIds = [...seenLevelIds, level.id];
      setSeenLevelIds(nextSeenLevelIds);

      window.setTimeout(() => {
        setRunLevel((value) => value + 1);
        void loadNextLevel(nextSeenLevelIds);
      }, revealDelayMs);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something broke.");
      setState("error");
    }
  };

  const restart = () => {
    setSeenLevelIds([]);
    setRunLevel(1);
    setChosenSide(null);
    void loadNextLevel([]);
  };

  const canShowBoard = choices.length > 0 && state !== "loading" && state !== "error" && state !== "exhausted";

  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="brand-lockup">
          <h1>PLEBSCAPE.COM</h1>
          <p>{slogan}</p>
        </div>
        <button
          ref={infoButtonRef}
          className="info-button"
          type="button"
          aria-label="Open game rules"
          onClick={() => setRulesOpen(true)}
        >
          i
        </button>
      </header>

      <section className="game-stage" aria-live="polite">
        {canShowBoard && (
          <>
            <div className="failure-slot">
              <div className="failure-banner" aria-hidden={state !== "failed"}>
                {state === "failed" && (
                  <>
                    <img className="failure-ape" src={apeImageSrc} alt="Ape mascot" />
                    <h2>YOU FAILED!</h2>
                  </>
                )}
              </div>
            </div>

            <p className="level-label">Level {runLevel}</p>

            <ChoiceGrid
              choices={choices}
              chosenSide={chosenSide}
              disabled={state !== "choosing"}
              onChoose={choose}
              result={result}
            />

            <div className="action-slot">
              {state === "failed" && result && (
                <FailureActions result={result} runLevel={runLevel} onRestart={restart} />
              )}
            </div>
          </>
        )}

        {state === "failed" && !canShowBoard && (
          <div className="failure-banner">
            <img className="failure-ape" src={apeImageSrc} alt="Ape mascot" />
            <h2>YOU FAILED!</h2>
          </div>
        )}

        {state === "loading" && <p className="status-text">...</p>}

        {state === "exhausted" && <ExhaustedPanel onRestart={restart} />}

        {state === "error" && (
          <div className="stack">
            <p className="status-text">{error}</p>
            <button className="text-button" type="button" onClick={restart}>
              START AGAIN
            </button>
          </div>
        )}
      </section>

      {rulesOpen && <RulesModal openerRef={infoButtonRef} onClose={() => setRulesOpen(false)} />}
    </main>
  );
}

function ChoiceGrid({
  choices,
  chosenSide,
  disabled,
  onChoose,
  result
}: {
  choices: DisplayChoice[];
  chosenSide: Side | null;
  disabled: boolean;
  onChoose: (side: Side) => Promise<void>;
  result: RevealedResult | null;
}) {
  return (
    <div className="choice-grid" aria-label="Choose one noun">
      {choices.map((choice) => {
        const percent =
          result && choice.side === "a"
            ? result.percentA
            : result && choice.side === "b"
              ? result.percentB
              : null;
        const isChosen = choice.side === chosenSide;

        return (
          <button
            aria-pressed={isChosen}
            className={`noun-button${isChosen ? " is-chosen" : ""}${percent !== null ? " has-result" : ""}`}
            disabled={disabled}
            key={choice.side}
            type="button"
            onClick={() => void onChoose(choice.side)}
          >
            <span className="noun-word">{choice.noun}</span>
            {percent !== null && <span className="noun-percent">{displayPercent(percent)}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ExhaustedPanel({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="stack">
      <h2>THE WORLD IS EMPTY</h2>
      <p className="status-text">Every noun has already been used.</p>
      <button className="text-button" type="button" onClick={onRestart}>
        START AGAIN
      </button>
    </div>
  );
}

function FailureActions({
  runLevel,
  result,
  onRestart
}: {
  runLevel: number;
  result: RevealedResult;
  onRestart: () => void;
}) {
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    setSharing(true);

    try {
      await shareFailureImage(result, runLevel);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="action-row">
      <button className="text-button" type="button" onClick={() => void share()} disabled={sharing}>
        {sharing ? "SHARING..." : "SHARE"}
      </button>
      <button className="text-button" type="button" onClick={onRestart}>
        START AGAIN
      </button>
    </div>
  );
}

function RulesModal({
  openerRef,
  onClose
}: {
  openerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        openerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, openerRef]);

  const close = () => {
    onClose();
    openerRef.current?.focus();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={close}>
      <div
        ref={dialogRef}
        aria-labelledby="rules-title"
        aria-modal="true"
        className="rules-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="rules-header">
          <h2 id="rules-title">How it works</h2>
          <button
            ref={closeButtonRef}
            className="close-button"
            type="button"
            aria-label="Close game rules"
            onClick={close}
          >
            x
          </button>
        </div>
        <ol className="rules-list">
          <li>You are shown two buttons.</li>
          <li>Each button contains one random noun. Example: tree / noise.</li>
          <li>You choose one button.</li>
          <li>Your vote is added to the global vote count for that level.</li>
          <li>The game reveals the percentages.</li>
          <li>You survive only if your chosen button has less than 50%.</li>
          <li>If your chosen button has 50% or more, you fail.</li>
        </ol>
      </div>
    </div>
  );
}

async function shareFailureImage(result: RevealedResult, runLevel: number) {
  const blob = await renderFailureImage(result, runLevel);
  const file = new File([blob], `plebscape-level-${runLevel}.png`, { type: "image/png" });
  const canShareFiles =
    typeof navigator !== "undefined" &&
    "canShare" in navigator &&
    navigator.canShare({ files: [file] });

  if (canShareFiles && "share" in navigator) {
    await navigator.share({
      title: "PLEBSCAPE.COM",
      text: `I failed PLEBSCAPE at level ${runLevel}.`,
      files: [file]
    });
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function renderFailureImage(result: RevealedResult, runLevel: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is unavailable.");
  }

  context.fillStyle = "#f4f1e8";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#0b0b0b";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const ape = await loadImage(apeImageSrc);
  context.drawImage(ape, 310, 80, 460, 460);

  drawText(context, `LEVEL ${runLevel}`, 540, 610, 82, "900");
  drawShareButton(context, {
    noun: result.nounA,
    percent: displayPercent(result.percentA),
    pressed: result.chosenSide === "a",
    x: 85,
    y: 700
  });
  drawShareButton(context, {
    noun: result.nounB,
    percent: displayPercent(result.percentB),
    pressed: result.chosenSide === "b",
    x: 555,
    y: 700
  });
  context.fillStyle = "#0b0b0b";
  drawText(context, "PLEBSCAPE.COM", 540, 960, 48, "900");
  context.fillStyle = "#68645b";
  drawText(context, slogan, 540, 1010, 30, "700");

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not render share image."));
      }
    }, "image/png");
  });
}

function drawShareButton(
  context: CanvasRenderingContext2D,
  {
    noun,
    percent,
    pressed,
    x,
    y
  }: { noun: string; percent: string; pressed: boolean; x: number; y: number }
) {
  const width = 440;
  const height = 180;

  context.fillStyle = pressed ? "#0b0b0b" : "#f4f1e8";
  context.fillRect(x, y, width, height);
  context.lineWidth = 6;
  context.strokeStyle = "#0b0b0b";
  context.strokeRect(x, y, width, height);
  context.fillStyle = pressed ? "#f4f1e8" : "#0b0b0b";
  drawText(context, noun, x + width / 2, y + 72, 54, "900");
  drawText(context, percent, x + width / 2, y + 130, 40, "700");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load ape image."));
    image.src = src;
  });
}

function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  weight: string
) {
  context.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
  context.fillText(text, x, y);
}
