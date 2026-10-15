const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export interface LatLng {
  lat: number;
  lng: number;
}

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, in degrees 0–360. */
export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

const ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
const WORDS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];

function octant(b: number): number {
  return Math.round(b / 45) % 8;
}

export const arrow = (b: number) => ARROWS[octant(b)];
export const direction = (b: number) => WORDS[octant(b)];

export function km(d: number): string {
  return `${Math.round(d).toLocaleString("en-US")} km`;
}
