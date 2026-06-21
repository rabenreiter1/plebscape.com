"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

import {
  calculateRunScore,
  displayPercent,
  getChosenPercentage,
  type LevelPublic,
  type RevealedResult,
  type Side
} from "@/lib/game";
import {
  isValidLeaderboardName,
  leaderboardMinimumLevel,
  truncateLeaderboardName,
  type LeaderboardEntry,
  type LeaderboardSubmission
} from "@/lib/leaderboard";

type GameState = "loading" | "choosing" | "submitting" | "revealed" | "failed" | "escaped" | "exhausted" | "error";
type DisplayChoice = {
  side: Side;
  noun: string;
};
type TerminalOutcome = "failed" | "escaped";

const slogan = "There is only one way to escape the pleb.";
const shareMessage = "Just got a new highscore in PLEBSCAPE 🐵 Can you beat me: plebscape.com";
const apeImageSrc = "/ape-game.png";
const escapedApeImageSrc = "/ape-escaped.png";
const finalLevel = 100;
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
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardPromptDismissed, setLeaderboardPromptDismissed] = useState(false);
  const [leaderboardSaved, setLeaderboardSaved] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [plebOpen, setPlebOpen] = useState(false);
  const leaderboardButtonRef = useRef<HTMLButtonElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const plebButtonRef = useRef<HTMLButtonElement>(null);

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

      if (runLevel === finalLevel) {
        setState("escaped");
        openLeaderboardForEligibleRun(runLevel);
        return;
      }

      if (!nextResult.passed) {
        setState("failed");
        openLeaderboardForEligibleRun(runLevel);
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
    setLeaderboardOpen(false);
    setLeaderboardPromptDismissed(false);
    setLeaderboardSaved(false);
    void loadNextLevel([]);
  };

  const canShowBoard = choices.length > 0 && state !== "loading" && state !== "error" && state !== "exhausted";
  const terminalOutcome: TerminalOutcome | null = state === "failed" || state === "escaped" ? state : null;
  const leaderboardSubmission =
    terminalOutcome &&
    runLevel >= leaderboardMinimumLevel &&
    !leaderboardPromptDismissed &&
    !leaderboardSaved
      ? {
          chosenPercentages,
          name: "",
          outcome: terminalOutcome,
          terminalLevel: runLevel
        }
      : null;

  function openLeaderboardForEligibleRun(terminalLevel: number) {
    setLeaderboardPromptDismissed(false);
    setLeaderboardSaved(false);

    if (terminalLevel >= leaderboardMinimumLevel) {
      setLeaderboardOpen(true);
    }
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div className="brand-lockup">
          <h1>PLEBSCAPE.COM</h1>
          <p>{slogan}</p>
        </div>
        <div className="header-actions">
          <button
            ref={leaderboardButtonRef}
            className="info-button"
            type="button"
            aria-label="Open Leaderboard"
            onClick={() => setLeaderboardOpen(true)}
          >
            🏆
          </button>
          <button
            ref={infoButtonRef}
            className="info-button"
            type="button"
            aria-label="Open game rules"
            onClick={() => setRulesOpen(true)}
          >
            i
          </button>
        </div>
      </header>

      <section className="game-stage" aria-live="polite">
        {canShowBoard && (
          <>
            <div className="failure-slot">
              {terminalOutcome ? (
                <div className="failure-banner">
                  <OutcomeHero outcome={terminalOutcome} />
                </div>
              ) : (
                <PlebPrompt
                  openerRef={plebButtonRef}
                  onOpen={() => setPlebOpen(true)}
                />
              )}
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
              {terminalOutcome && result && (
                <FailureActions
                  chosenPercentages={chosenPercentages}
                  outcome={terminalOutcome}
                  result={result}
                  runLevel={runLevel}
                  onRestart={restart}
                />
              )}
            </div>
          </>
        )}

        {terminalOutcome && !canShowBoard && (
          <div className="failure-banner">
            <OutcomeHero outcome={terminalOutcome} />
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

      {leaderboardOpen && (
        <LeaderboardModal
          openerRef={leaderboardButtonRef}
          submission={leaderboardSubmission}
          onClose={() => setLeaderboardOpen(false)}
          onDismissSubmission={() => {
            setLeaderboardPromptDismissed(true);
            setLeaderboardOpen(false);
          }}
          onSaved={() => setLeaderboardSaved(true)}
        />
      )}
      {rulesOpen && <RulesModal openerRef={infoButtonRef} onClose={() => setRulesOpen(false)} />}
      {plebOpen && <PlebModal openerRef={plebButtonRef} onClose={() => setPlebOpen(false)} />}
    </main>
  );
}

function PlebPrompt({
  openerRef,
  onOpen
}: {
  openerRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
}) {
  return (
    <p className="pleb-prompt">
      Choose what the{" "}
      <button
        ref={openerRef}
        className="pleb-link"
        type="button"
        aria-label="Open pleb definition"
        onClick={onOpen}
      >
        pleb
      </button>{" "}
      didn’t.
    </p>
  );
}

function OutcomeHero({ outcome }: { outcome: TerminalOutcome }) {
  const isEscaped = outcome === "escaped";
  const imageSrc = isEscaped ? escapedApeImageSrc : apeImageSrc;
  const secondLine = isEscaped ? "ESCAPED!" : "FAILED!";
  const heroFontSize = isEscaped ? 72 : 82;
  const heroGroupX = isEscaped ? 69 : 95;

  return (
    <>
      <h2 className="sr-only">YOU {secondLine}</h2>
      <svg
        aria-hidden="true"
        className="failure-hero-mark"
        focusable="false"
        role="img"
        viewBox="0 0 720 220"
      >
        <g transform={`translate(${heroGroupX} 22)`}>
          <image href={imageSrc} x="0" y="14" width="150" height="150" preserveAspectRatio="xMidYMid meet" />
          <text
            x="182"
            y="72"
            fill="currentColor"
            fontFamily="Arial, Helvetica, sans-serif"
            fontSize={heroFontSize}
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
            fontSize={heroFontSize}
            fontWeight="900"
            textAnchor="start"
          >
            {secondLine}
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
  outcome,
  runLevel,
  result,
  onRestart
}: {
  chosenPercentages: number[];
  outcome: TerminalOutcome;
  runLevel: number;
  result: RevealedResult;
  onRestart: () => void;
}) {
  const [sharing, setSharing] = useState(false);

  const share = async () => {
    setSharing(true);

    try {
      await shareFailureImage(result, runLevel, chosenPercentages, outcome);
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

function ModalShell({
  children,
  closeLabel,
  openerRef,
  title,
  titleId,
  onClose
}: {
  children: ReactNode;
  closeLabel: string;
  openerRef: RefObject<HTMLButtonElement | null>;
  title: string;
  titleId: string;
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
        aria-labelledby={titleId}
        aria-modal="true"
        className="rules-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="rules-header">
          <h2 id={titleId}>{title}</h2>
          <button
            ref={closeButtonRef}
            className="close-button"
            type="button"
            aria-label={closeLabel}
            onClick={close}
          >
            x
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LeaderboardModal({
  openerRef,
  submission,
  onClose,
  onDismissSubmission,
  onSaved
}: {
  openerRef: RefObject<HTMLButtonElement | null>;
  submission: LeaderboardSubmission | null;
  onClose: () => void;
  onDismissSubmission: () => void;
  onSaved: () => void;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const canSave = Boolean(submission) && isValidLeaderboardName(name) && !saving;

  useEffect(() => {
    let isMounted = true;

    const loadLeaderboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/leaderboard");

        if (!response.ok) {
          throw new Error("Could not load the leaderboard.");
        }

        const data = (await response.json()) as { entries: LeaderboardEntry[] };

        if (isMounted) {
          setEntries(data.entries);
        }
      } catch (cause) {
        if (isMounted) {
          setError(cause instanceof Error ? cause.message : "Could not load the leaderboard.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const save = async () => {
    if (!submission || !canSave) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...submission, name })
      });

      if (!response.ok) {
        throw new Error("Could not save your score.");
      }

      const data = (await response.json()) as { entries: LeaderboardEntry[] };
      setEntries(data.entries);
      setName("");
      setSavedMessage("Saved. Your score is now in the list.");
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your score.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      closeLabel="Close Leaderboard"
      openerRef={openerRef}
      title="Leaderboard"
      titleId="leaderboard-title"
      onClose={onClose}
    >
      <div className="leaderboard-panel">
        {submission ? (
          <div className="leaderboard-save-panel">
            <p className="leaderboard-copy">
              Congratulations! You made it into the top players. Type your name to save your highscore.
            </p>
            <div className="leaderboard-form">
              <label className="leaderboard-label" htmlFor="leaderboard-name">
                Name
              </label>
              <input
                id="leaderboard-name"
                className="leaderboard-input"
                type="text"
                value={name}
                aria-describedby="leaderboard-name-hint"
                onChange={(event) => {
                  setName(truncateLeaderboardName(event.currentTarget.value));
                }}
              />
              <p id="leaderboard-name-hint" className="leaderboard-hint">
                1-10 characters. All characters allowed.
              </p>
              <div className="leaderboard-actions">
                <button className="text-button" type="button" disabled={!canSave} onClick={() => void save()}>
                  {saving ? "SAVING..." : "SAVE"}
                </button>
                <button className="text-button" type="button" onClick={onDismissSubmission}>
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="leaderboard-copy">{savedMessage ?? "Top players in PLEBSCAPE."}</p>
        )}

        {error && <p className="leaderboard-error">{error}</p>}

        <div className="leaderboard-list" role="list" aria-label="Top 100 scores">
          {loading ? (
            <p className="leaderboard-empty">Loading...</p>
          ) : entries.length > 0 ? (
            entries.map((entry) => (
              <div
                className={`leaderboard-row${entry.rank <= 3 ? " is-podium" : ""}${
                  entry.rank === 1 ? " is-first" : ""
                }`}
                key={entry.id}
                role="listitem"
              >
                <span className="leaderboard-rank">
                  {entry.rank === 1 && (
                    <span aria-hidden="true" className="leaderboard-crown">
                      ♛
                    </span>
                  )}
                  #{entry.rank}
                </span>
                <span className="leaderboard-name" title={entry.name}>
                  {entry.name}
                </span>
                <span className="leaderboard-score">SCORE {entry.scoreDisplay}</span>
              </div>
            ))
          ) : (
            <p className="leaderboard-empty">No scores saved yet.</p>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

function RulesModal({
  openerRef,
  onClose
}: {
  openerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  return (
    <ModalShell
      closeLabel="Close game rules"
      openerRef={openerRef}
      title="How it works"
      titleId="rules-title"
      onClose={onClose}
    >
      <ol className="rules-list">
        <li>You are shown two buttons with one word each.</li>
        <li>You choose one button.</li>
        <li>Your vote is added to the global vote count for that level.</li>
        <li>The game reveals the percentages.</li>
        <li>You survive only if your chosen button has less than 50%.</li>
        <li>If your chosen button has 50% or more, you fail.</li>
      </ol>
    </ModalShell>
  );
}

function PlebModal({
  openerRef,
  onClose
}: {
  openerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  return (
    <ModalShell
      closeLabel="Close pleb definition"
      openerRef={openerRef}
      title="pleb"
      titleId="pleb-title"
      onClose={onClose}
    >
      <div className="definition-entry">
        <p className="definition-pronunciation">
          <em>/plɛb/</em> <strong>— PLEB</strong>
        </p>
        <p className="definition-part">noun</p>
        <ol className="definition-list">
          <li>An ordinary person who follows the crowd by default.</li>
          <li>A person ruled by mass taste, mass behavior, or low-agency thinking.</li>
        </ol>
        <p className="definition-etymology">
          <strong>Etymology:</strong> Short for <em>plebeian</em>, from Latin <em>plēbs</em>,
          meaning “the common people” or “the non-aristocratic class” in ancient Rome.
        </p>
      </div>
    </ModalShell>
  );
}

async function shareFailureImage(
  result: RevealedResult,
  runLevel: number,
  chosenPercentages: number[],
  outcome: TerminalOutcome
) {
  const blob = await renderFailureImage(result, runLevel, chosenPercentages, outcome);
  const file = new File([blob], `plebscape-level-${runLevel}.png`, { type: "image/png" });
  const canShareFiles =
    typeof navigator !== "undefined" &&
    "canShare" in navigator &&
    navigator.canShare({ files: [file] });

  if (canShareFiles && "share" in navigator) {
    await navigator.share({
      title: "PLEBSCAPE.COM",
      text: shareMessage,
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
  chosenPercentages: number[],
  outcome: TerminalOutcome
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

  const ape = await loadImage(outcome === "escaped" ? escapedApeImageSrc : apeImageSrc);
  drawShareScoreHeader(context, ape, runLevel, score.scoreDisplay);

  drawText(context, `AVERAGE CHOICE: ${score.averageChoiceDisplay}`, 540, 500, 34, "700");
  drawShareButtonPair(context, [
    {
      noun: result.nounA,
      percent: displayPercent(result.percentA),
      pressed: result.chosenSide === "a",
      x: 85,
      y: 575
    },
    {
      noun: result.nounB,
      percent: displayPercent(result.percentB),
      pressed: result.chosenSide === "b",
      x: 555,
      y: 575
    }
  ]);
  context.fillStyle = "#0b0b0b";
  drawText(context, "PLEBSCAPE.COM", 540, 910, 48, "900");
  context.fillStyle = "#68645b";
  drawText(context, slogan, 540, 965, 30, "700");

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
  const internalApeSize = 300;
  const internalTextX = 340;
  const internalApeY = 5;
  const internalGroupY = 110;
  const maxRenderedWidth = 900;
  const levelText = `LEVEL ${runLevel}`;
  const scoreText = `SCORE ${scoreDisplay}`;
  const baseLevelSize = 78;
  const baseScoreSize = 62;

  context.font = `900 ${baseLevelSize}px Arial, Helvetica, sans-serif`;
  const levelWidth = context.measureText(levelText).width;
  context.font = `900 ${baseScoreSize}px Arial, Helvetica, sans-serif`;
  const scoreWidth = context.measureText(scoreText).width;
  const textBlockWidth = Math.max(levelWidth, scoreWidth);
  const internalContentWidth = Math.max(internalApeSize, internalTextX + textBlockWidth);
  const scale = internalContentWidth > maxRenderedWidth ? maxRenderedWidth / internalContentWidth : 1;
  const groupX = (1080 - internalContentWidth * scale) / 2;
  const scaled = (value: number) => value * scale;
  const drawX = (value: number) => groupX + scaled(value);
  const drawY = (value: number) => internalGroupY + scaled(value);

  context.drawImage(
    ape,
    drawX(0),
    drawY(internalApeY),
    scaled(internalApeSize),
    scaled(internalApeSize)
  );
  context.textAlign = "left";
  context.fillStyle = "#0b0b0b";
  drawText(context, levelText, drawX(internalTextX), drawY(128), scaled(baseLevelSize), "900");
  drawText(context, scoreText, drawX(internalTextX), drawY(206), scaled(baseScoreSize), "900");
  context.textAlign = "center";
}

type ShareButtonConfig = {
  noun: string;
  percent: string;
  pressed: boolean;
  x: number;
  y: number;
};

function drawShareButtonPair(context: CanvasRenderingContext2D, buttons: ShareButtonConfig[]) {
  const width = 440;
  const height = 160;
  const borderWidth = 6;
  const maxTextWidth = width - 36;
  const nounLineHeight = 0.92;
  const percentPadding = 4;
  const minimumPercentFontSize = 16;
  const maxNounFontSize = 54;

  const nounWidthFit = Math.min(
    ...buttons.map((button) => getFittedTextSize(context, button.noun, maxNounFontSize, "900", maxTextWidth))
  );
  const maxNounSizeByVerticalSpace =
    ((height / 2 - borderWidth - percentPadding * 2 - minimumPercentFontSize) * 2) / nounLineHeight;
  const nounFontSize = Math.max(12, Math.min(nounWidthFit, maxNounSizeByVerticalSpace));
  const nounLineBoxHeight = nounFontSize * nounLineHeight;
  const nounTopY = height / 2 - nounLineBoxHeight / 2;
  const topBandHeight = nounTopY - borderWidth;
  const verticalFillPercentSize = Math.max(minimumPercentFontSize, topBandHeight - percentPadding * 2);
  const percentFontSize = getFittedTextSize(
    context,
    "100%",
    verticalFillPercentSize,
    "900",
    maxTextWidth
  );
  const percentCenterY = borderWidth + topBandHeight / 2;

  buttons.forEach(({ noun, percent, pressed, x, y }) => {
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    context.fillStyle = pressed ? "#0b0b0b" : "#f4f1e8";
    context.fillRect(x, y, width, height);
    context.lineWidth = borderWidth;
    context.strokeStyle = "#0b0b0b";
    context.strokeRect(x, y, width, height);
    context.fillStyle = pressed ? "#f4f1e8" : "#0b0b0b";
    drawText(context, percent, centerX, y + percentCenterY, percentFontSize, "900");
    drawText(context, noun, centerX, centerY, nounFontSize, "900");
  });
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

function getFittedTextSize(
  context: CanvasRenderingContext2D,
  text: string,
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

  return fittedSize;
}
