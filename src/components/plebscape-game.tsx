"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import {
  calculateRunScore,
  displayPercent,
  getChosenPercentage,
  type LevelPublic,
  type RevealedResult,
  type Side
} from "@/lib/game";

type GameState = "loading" | "choosing" | "submitting" | "revealed" | "failed" | "exhausted" | "error";
type DisplayChoice = {
  side: Side;
  noun: string;
};

const slogan = "There is only one way to escape the pleb.";
const apeImageSrc = "/ape-game.png";
const revealDelayMs = 2000;
const fittedTextMinPx = 24;
const fittedTextMaxPx = 112;
const percentPaddingPx = 4;
const minimumPercentFontSizePx = 16;
const nounLineHeight = 0.92;

type ChoiceTypography = {
  nounFontSize: number;
  percentCenterYBySide: Record<Side, number>;
  percentFontSizeBySide: Record<Side, number>;
};

const initialChoiceTypography: ChoiceTypography = {
  nounFontSize: fittedTextMinPx,
  percentCenterYBySide: { a: 12, b: 12 },
  percentFontSizeBySide: { a: minimumPercentFontSizePx, b: minimumPercentFontSizePx }
};

export function PlebscapeGame() {
  const [state, setState] = useState<GameState>("loading");
  const [level, setLevel] = useState<LevelPublic | null>(null);
  const [choices, setChoices] = useState<DisplayChoice[]>([]);
  const [seenLevelIds, setSeenLevelIds] = useState<string[]>([]);
  const [runLevel, setRunLevel] = useState(1);
  const [result, setResult] = useState<RevealedResult | null>(null);
  const [chosenPercentages, setChosenPercentages] = useState<number[]>([]);
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
      const nextChosenPercentages = [...chosenPercentages, getChosenPercentage(nextResult)];
      setResult(nextResult);
      setChosenSide(nextResult.chosenSide);
      setChosenPercentages(nextChosenPercentages);

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
    setChosenPercentages([]);
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
                {state === "failed" && <FailureHero />}
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
                <FailureActions
                  chosenPercentages={chosenPercentages}
                  result={result}
                  runLevel={runLevel}
                  onRestart={restart}
                />
              )}
            </div>
          </>
        )}

        {state === "failed" && !canShowBoard && (
          <div className="failure-banner">
            <FailureHero />
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

function FailureHero() {
  return (
    <>
      <h2 className="sr-only">YOU FAILED!</h2>
      <svg
        aria-hidden="true"
        className="failure-hero-mark"
        focusable="false"
        role="img"
        viewBox="0 0 720 220"
      >
        <g transform="translate(95 22)">
          <image href={apeImageSrc} x="0" y="14" width="150" height="150" preserveAspectRatio="xMidYMid meet" />
          <text
            x="182"
            y="72"
            fill="currentColor"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="82"
            fontWeight="900"
            textAnchor="start"
          >
            YOU
          </text>
          <text
            x="182"
            y="150"
            fill="currentColor"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize="82"
            fontWeight="900"
            textAnchor="start"
          >
            FAILED!
          </text>
        </g>
      </svg>
    </>
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
  const buttonRefs = useRef<Record<Side, HTMLButtonElement | null>>({ a: null, b: null });
  const [typography, setTypography] = useState<ChoiceTypography>(initialChoiceTypography);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    let animationFrame = 0;
    const fit = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const sizes = choices
          .map((choice) => {
            const button = buttonRefs.current[choice.side];
            return button ? getFittedNounSize(context, choice.noun, button) : null;
          })
          .filter((size): size is number => size !== null);

        if (sizes.length === choices.length) {
          const nounFontSize = Math.floor(Math.min(...sizes));
          const percentCenterYBySide = choices.reduce<Record<Side, number>>(
            (centers, choice) => {
              const button = buttonRefs.current[choice.side];
              centers[choice.side] = button ? getPercentCenterY(nounFontSize, button) : centers[choice.side];
              return centers;
            },
            { a: 12, b: 12 }
          );
          const percentFontSizeBySide = choices.reduce<Record<Side, number>>(
            (fontSizes, choice) => {
              const button = buttonRefs.current[choice.side];
              fontSizes[choice.side] = button
                ? getPercentFontSize(context, nounFontSize, button)
                : fontSizes[choice.side];
              return fontSizes;
            },
            { a: minimumPercentFontSizePx, b: minimumPercentFontSizePx }
          );

          setTypography({ nounFontSize, percentCenterYBySide, percentFontSizeBySide });
        }
      });
    };

    fit();

    const observer = new ResizeObserver(fit);
    choices.forEach((choice) => {
      const button = buttonRefs.current[choice.side];

      if (button) {
        observer.observe(button);
      }
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [choices]);

  const typographyStyle = {
    "--noun-font-size": `${typography.nounFontSize}px`
  } as CSSProperties;

  return (
    <div className="choice-grid" style={typographyStyle} aria-label="Choose one noun">
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
            ref={(button) => {
              buttonRefs.current[choice.side] = button;
            }}
            style={
              {
                "--percent-center-y": `${typography.percentCenterYBySide[choice.side]}px`,
                "--percent-font-size": `${typography.percentFontSizeBySide[choice.side]}px`
              } as CSSProperties
            }
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

function getFittedNounSize(
  context: CanvasRenderingContext2D,
  text: string,
  button: HTMLButtonElement
) {
  const styles = window.getComputedStyle(button);
  const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  const verticalPadding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
  const availableWidth = Math.max(1, button.clientWidth - horizontalPadding - 8);
  const availableHeight = Math.max(1, button.clientHeight - verticalPadding);

  let low = fittedTextMinPx;
  let high = fittedTextMaxPx;

  while (high - low > 0.5) {
    const next = (low + high) / 2;
    context.font = `900 ${next}px Arial, Helvetica, sans-serif`;
    const measuredWidth = context.measureText(text).width;
    const nounLineBoxHeight = next * nounLineHeight;
    const nounTopY = button.clientHeight / 2 - nounLineBoxHeight / 2;

    if (
      measuredWidth <= availableWidth &&
      nounLineBoxHeight <= availableHeight &&
      nounTopY >= minimumPercentFontSizePx + percentPaddingPx * 2
    ) {
      low = next;
    } else {
      high = next;
    }
  }

  return low;
}

function getPercentCenterY(nounFontSize: number, button: HTMLButtonElement) {
  const nounLineBoxHeight = nounFontSize * nounLineHeight;
  const nounTopY = button.clientHeight / 2 - nounLineBoxHeight / 2;

  return Math.max(0, nounTopY / 2);
}

function getPercentFontSize(
  context: CanvasRenderingContext2D,
  nounFontSize: number,
  button: HTMLButtonElement
) {
  const styles = window.getComputedStyle(button);
  const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  const availableWidth = Math.max(1, button.clientWidth - horizontalPadding - 8);
  const nounLineBoxHeight = nounFontSize * nounLineHeight;
  const nounTopY = button.clientHeight / 2 - nounLineBoxHeight / 2;
  const verticalFillFontSize = Math.max(minimumPercentFontSizePx, nounTopY - percentPaddingPx * 2);
  const widthFitFontSize = getFittedPercentSize(context, "100%", availableWidth);

  return Math.max(minimumPercentFontSizePx, Math.min(verticalFillFontSize, widthFitFontSize));
}

function getFittedPercentSize(
  context: CanvasRenderingContext2D,
  text: string,
  availableWidth: number
) {
  let low = minimumPercentFontSizePx;
  let high = 220;

  while (high - low > 0.5) {
    const next = (low + high) / 2;
    context.font = `900 ${next}px Arial, Helvetica, sans-serif`;

    if (context.measureText(text).width <= availableWidth) {
      low = next;
    } else {
      high = next;
    }
  }

  return low;
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
  chosenPercentages,
  runLevel,
  result,
  onRestart
}: {
  chosenPercentages: number[];
  runLevel: number;
  result: RevealedResult;
  onRestart: () => void;
}) {
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    setSharing(true);

    try {
      await shareFailureImage(result, runLevel, chosenPercentages);
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
          <li>You are shown two buttons with one word each.</li>
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

async function shareFailureImage(result: RevealedResult, runLevel: number, chosenPercentages: number[]) {
  const blob = await renderFailureImage(result, runLevel, chosenPercentages);
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

async function renderFailureImage(
  result: RevealedResult,
  runLevel: number,
  chosenPercentages: number[]
): Promise<Blob> {
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
  const score = calculateRunScore({ chosenPercentages, failedLevel: runLevel });

  const ape = await loadImage(apeImageSrc);
  drawShareScoreHeader(context, ape, runLevel, score.scoreDisplay);

  drawText(context, `AVERAGE CHOICE: ${score.averageChoiceDisplay}`, 540, 650, 34, "700");
  drawShareButton(context, {
    noun: result.nounA,
    percent: displayPercent(result.percentA),
    pressed: result.chosenSide === "a",
    x: 85,
    y: 710
  });
  drawShareButton(context, {
    noun: result.nounB,
    percent: displayPercent(result.percentB),
    pressed: result.chosenSide === "b",
    x: 555,
    y: 710
  });
  context.fillStyle = "#0b0b0b";
  drawText(context, "PLEBSCAPE.COM", 540, 950, 48, "900");
  context.fillStyle = "#68645b";
  drawText(context, slogan, 540, 1005, 30, "700");

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

function drawShareScoreHeader(
  context: CanvasRenderingContext2D,
  ape: HTMLImageElement,
  runLevel: number,
  scoreDisplay: number
) {
  const apeSize = 320;
  const gap = 36;
  const maxGroupWidth = 900;
  const levelText = `LEVEL ${runLevel}`;
  const scoreText = `SCORE ${scoreDisplay}`;
  const baseLevelSize = 78;
  const baseScoreSize = 62;

  const measureTextBlock = (scale: number) => {
    context.font = `900 ${baseLevelSize * scale}px Arial, Helvetica, sans-serif`;
    const levelWidth = context.measureText(levelText).width;
    context.font = `900 ${baseScoreSize * scale}px Arial, Helvetica, sans-serif`;
    const scoreWidth = context.measureText(scoreText).width;
    return Math.max(levelWidth, scoreWidth);
  };

  const baseTextBlockWidth = measureTextBlock(1);
  const baseGroupWidth = apeSize + gap + baseTextBlockWidth;
  const scale = baseGroupWidth > maxGroupWidth ? maxGroupWidth / baseGroupWidth : 1;
  const textBlockWidth = measureTextBlock(scale);
  const groupWidth = apeSize + gap + textBlockWidth;
  const groupX = (1080 - groupWidth) / 2;
  const textX = groupX + apeSize + gap;
  const apeY = 90;
  const apeCenterY = apeY + apeSize / 2;
  const lineOffset = 38 * scale;

  context.drawImage(ape, groupX, apeY, apeSize, apeSize);
  context.textAlign = "left";
  context.fillStyle = "#0b0b0b";
  drawText(context, levelText, textX, apeCenterY - lineOffset, baseLevelSize * scale, "900");
  drawText(context, scoreText, textX, apeCenterY + lineOffset, baseScoreSize * scale, "900");
  context.textAlign = "center";
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
  const height = 160;

  context.fillStyle = pressed ? "#0b0b0b" : "#f4f1e8";
  context.fillRect(x, y, width, height);
  context.lineWidth = 6;
  context.strokeStyle = "#0b0b0b";
  context.strokeRect(x, y, width, height);
  context.fillStyle = pressed ? "#f4f1e8" : "#0b0b0b";
  drawFittedText(context, percent, x + width / 2, y + 45, 70, "900", width - 36);
  drawFittedText(context, noun, x + width / 2, y + 105, 54, "900", width - 36);
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

function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  weight: string,
  maxWidth: number
) {
  let fittedSize = size;

  while (fittedSize > 12) {
    context.font = `${weight} ${fittedSize}px Arial, Helvetica, sans-serif`;

    if (context.measureText(text).width <= maxWidth) {
      break;
    }

    fittedSize -= 2;
  }

  context.fillText(text, x, y);
}
