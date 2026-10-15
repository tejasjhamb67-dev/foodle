"use client";
/* eslint-disable @next/next/no-img-element */
import { BarChart3, Share2 } from "lucide-react";
import { verdict, type AnswerCard as Answer, type Mode } from "@foodle/game";
import { Countdown } from "./Countdown";

export function AnswerCard({
  answer,
  mode,
  won,
  guesses,
  daily,
  assisted,
  onShare,
  onStats,
}: {
  answer: Answer;
  mode: Mode;
  won: boolean;
  guesses: number;
  daily: boolean;
  assisted?: boolean;
  onShare: () => void;
  onStats: () => void;
}) {
  const origin = [answer.state && answer.state !== "Pan-India" ? answer.state : null, answer.country].filter(Boolean).join(", ");
  const kindLine =
    answer.kind === "dish"
      ? [answer.course, answer.diet].filter(Boolean).join(" · ")
      : [answer.type, answer.alcoholic ? "Alcoholic" : "Zero-proof", answer.serve].filter(Boolean).join(" · ");
  const word = verdict(won, guesses);
  return (
    <section className="answer" aria-labelledby="answer-name">
      <div className="photo">
        {answer.image ? (
          <img src={answer.image.url} alt={answer.name} width={answer.image.w || undefined} height={answer.image.h || undefined} decoding="async" />
        ) : (
          <div className="placeholder">
            <div className="plate" aria-hidden>
              {answer.flag || answer.name[0]}
            </div>
            <span className="t-meta">Photo coming soon</span>
          </div>
        )}
      </div>
      {answer.image && (
        <p className="t-meta" style={{ margin: "6px 0 0" }}>
          Photo: {answer.image.author}
          {answer.image.licence ? ` · ${answer.image.licence}` : ""}
          {answer.image.sourceUrl.includes("wikimedia") ? " · via Wikimedia Commons" : ""}
        </p>
      )}

      <div className="verdict">
        <span className={`pill ${won ? "correct" : "absent"}`}>{won ? `Solved in ${guesses}` : "Missed"}{assisted ? " · with options" : ""}</span>
        <span className="t-headline">{word}</span>
      </div>
      {mode === "cuisine" && answer.target && (
        <p className="t-headline" style={{ margin: "4px 0" }}>
          The answer was {answer.target.flag ? `${answer.target.flag} ` : ""}
          {answer.target.name}
        </p>
      )}
      <h2 id="answer-name" className="t-display" style={{ margin: "4px 0 2px" }}>
        {answer.name}
      </h2>
      <p className="t-meta" style={{ margin: 0 }}>
        {answer.aliases.length ? `Also known as ${answer.aliases.join(", ")} · ` : ""}
        {answer.flag ? `${answer.flag} ` : ""}
        {origin}
      </p>
      <p className="t-meta" style={{ margin: "2px 0 0" }}>
        {kindLine}
      </p>
      {answer.originNote && (
        <p className="banner" style={{ fontSize: 13 }}>
          {answer.originNote}
        </p>
      )}
      <div className="ingredients" aria-label="Ingredients">
        {answer.ingredients.map((i) => (
          <span key={i} className="chip">
            {i}
          </span>
        ))}
        {answer.hints.map((h) => (
          <span key={h} className="chip locked" style={{ color: "var(--color-text-muted)" }}>
            {h}
          </span>
        ))}
      </div>
      <div className="answer-actions">
        <button className="btn primary" onClick={onShare}>
          <Share2 size={20} strokeWidth={2} /> Share
        </button>
        <button className="btn secondary" onClick={onStats}>
          <BarChart3 size={20} strokeWidth={2} /> See stats
        </button>
      </div>
      {daily ? <Countdown /> : <p className="countdown t-meta">Archive play · doesn&rsquo;t change your streak</p>}
      {answer.imageSearch && !answer.image && (
        <p className="t-meta" style={{ textAlign: "center" }}>
          <a href={answer.imageSearch} target="_blank" rel="noreferrer">
            See photos of {answer.name} on Wikimedia Commons
          </a>
        </p>
      )}
    </section>
  );
}
