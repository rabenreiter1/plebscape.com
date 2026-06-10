"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { displayPercent, type LevelPublic, type RevealedResult, type Side } from "@/lib/game";

type GameState = "loading" | "choosing" | "revealed" | "failed" | "error";
type DisplayChoice = {
  side: Side;
  noun: string;
};

const slogan = "There is only one way to escape the pleb.";
const revealDelayMs = 1400;

export function PlebscapeGame() {
  const [state, setState] = useState<GameState>("loading");
  const [level, setLevel] = useState<LevelPublic | null>(null);
  const [choices, setChoices] = useState<DisplayChoice[]>([]);
  const [seenLevelIds, setSeenLevelIds] = useState<string[]>([]);
  const [runLevel, setRunLevel] = useState(1);
  const [result, setResult] = useState<RevealedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  const loadNextLevel = useCallback(
    async (nextSeenLevelIds = seenLevelIds) => {
      setState("loading");
      setResult(null);
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

        const data = (await response.json()) as { level: LevelPublic };
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

    setState("loading");
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
    void loadNextLevel([]);
  };

  const resultRows = useMemo(() => {
    if (!result) {
      return [];
    }

    return [
      { side: "a" as Side, noun: result.nounA, percent: result.percentA },
      { side: "b" as Side, noun: result.nounB, percent: result.percentB }
    ];
  }, [result]);

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
        <p className="level-label">Level {runLevel}</p>

        {state === "choosing" && (
          <div className="choice-grid" aria-label="Choose one noun">
            {choices.map((choice) => (
              <button
                className="noun-button"
                key={choice.side}
                type="button"
                onClick={() => void choose(choice.side)}
              >
                {choice.noun}
              </button>
            ))}
          </div>
        )}

        {state === "loading" && <p className="status-text">...</p>}

        {state === "revealed" && result && (
          <ResultPanel heading="ESCAPED" resultRows={resultRows} chosenSide={result.chosenSide} />
        )}

        {state === "failed" && result && (
          <FailurePanel
            runLevel={runLevel}
            result={result}
            resultRows={resultRows}
            onRestart={restart}
          />
        )}

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

function ResultPanel({
  heading,
  resultRows,
  chosenSide
}: {
  heading: string;
  resultRows: Array<{ side: Side; noun: string; percent: number }>;
  chosenSide: Side;
}) {
  return (
    <div className="result-panel">
      <h2>{heading}</h2>
      <ResultRows resultRows={resultRows} chosenSide={chosenSide} />
    </div>
  );
}

function FailurePanel({
  runLevel,
  result,
  resultRows,
  onRestart
}: {
  runLevel: number;
  result: RevealedResult;
  resultRows: Array<{ side: Side; noun: string; percent: number }>;
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
    <div className="failure-panel">
      <p className="site-repeat">PLEBSCAPE.COM</p>
      <h2>YOU FAILED!</h2>
      <p className="failed-level">Level {runLevel}</p>
      <ResultRows resultRows={resultRows} chosenSide={result.chosenSide} />
      <div className="action-row">
        <button className="text-button" type="button" onClick={() => void share()} disabled={sharing}>
          {sharing ? "SHARING..." : "SHARE"}
        </button>
        <button className="text-button" type="button" onClick={onRestart}>
          START AGAIN
        </button>
      </div>
    </div>
  );
}

function ResultRows({
  resultRows,
  chosenSide
}: {
  resultRows: Array<{ side: Side; noun: string; percent: number }>;
  chosenSide: Side;
}) {
  return (
    <dl className="result-list">
      {resultRows.map((row) => (
        <div className={row.side === chosenSide ? "chosen-row" : undefined} key={row.side}>
          <dt>{row.noun}</dt>
          <dd>{displayPercent(row.percent)}</dd>
        </div>
      ))}
    </dl>
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

  drawText(context, "PLEBSCAPE.COM", 540, 150, 54, "700");
  drawText(context, "YOU FAILED", 540, 315, 92, "900");
  drawText(context, `LEVEL ${runLevel}`, 540, 455, 64, "800");
  drawText(context, result.nounA, 540, 635, 68, "700");
  drawText(context, displayPercent(result.percentA), 540, 710, 54, "500");
  drawText(context, result.nounB, 540, 820, 68, "700");
  drawText(context, displayPercent(result.percentB), 540, 895, 54, "500");
  drawText(context, slogan, 540, 1010, 32, "700");

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
