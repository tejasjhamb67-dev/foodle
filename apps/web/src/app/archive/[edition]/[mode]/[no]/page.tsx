import { notFound } from "next/navigation";
import { Game } from "@/components/Game";
import { parseEdition, parseMode } from "@/server/params";
import { isPlayable } from "@/server/today";

export const metadata = { title: "Archive" };

export default async function ArchivePlay({ params }: { params: Promise<{ edition: string; mode: string; no: string }> }) {
  const p = await params;
  const edition = parseEdition(p.edition);
  const mode = parseMode(p.mode);
  const n = Number(p.no);
  if (!edition || !mode || !isPlayable(n)) notFound();
  return <Game key={`${edition}:${mode}:${n}`} edition={edition} mode={mode} archiveNumber={n} />;
}
