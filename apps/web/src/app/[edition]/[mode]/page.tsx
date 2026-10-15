import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EDITION_LABEL, MODE_LABEL } from "@foodle/game";
import { Game } from "@/components/Game";
import { parseEdition, parseMode } from "@/server/params";

type Props = { params: Promise<{ edition: string; mode: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const edition = parseEdition(p.edition);
  const mode = parseMode(p.mode);
  if (!edition || !mode) return {};
  return { title: `${MODE_LABEL[mode]} · ${EDITION_LABEL[edition]}` };
}

export function generateStaticParams() {
  return ["global", "india"].flatMap((edition) => ["dish", "drink", "cuisine"].map((mode) => ({ edition, mode })));
}

export default async function PlayPage({ params }: Props) {
  const p = await params;
  const edition = parseEdition(p.edition);
  const mode = parseMode(p.mode);
  if (!edition || !mode) notFound();
  return <Game key={`${edition}:${mode}`} edition={edition} mode={mode} />;
}
