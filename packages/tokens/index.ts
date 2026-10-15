import tokens from "./tokens.json";

export type ThemeName = "light" | "dark";
export type ColorToken = keyof typeof tokens.color.light;

export const color = tokens.color;
export const space = tokens.space;
export const radius = tokens.radius;
export const size = tokens.size;
export const motion = tokens.motion;
export const font = tokens.font;
export default tokens;

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

/** CSS custom properties for one theme, e.g. `--color-text-muted: #6E7174;` */
export function cssVars(theme: ThemeName): string {
  return Object.entries(tokens.color[theme])
    .map(([k, v]) => `--color-${kebab(k)}: ${v};`)
    .join(" ");
}
