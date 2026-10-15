import Link from "next/link";

const TILES = [
  ["F", "c"],
  ["O", "p"],
  ["O", "a"],
  ["D", "c"],
  ["L", "p"],
  ["E", "c"],
] as const;

/** Spec 3.5: FOODLE in six tiles — green, yellow, grey, green, yellow, green. */
export function Wordmark({ size = 26, href = "/" }: { size?: number; href?: string | null }) {
  const inner = TILES.map(([l, s], i) => (
    <span key={i} className={s} aria-hidden>
      {l}
    </span>
  ));
  const style = { ["--wm" as string]: `${size}px` };
  if (!href) {
    return (
      <span className="wordmark" style={style} role="img" aria-label="Foodle">
        {inner}
      </span>
    );
  }
  return (
    <Link href={href} className="wordmark" style={style} aria-label="Foodle home">
      {inner}
    </Link>
  );
}
