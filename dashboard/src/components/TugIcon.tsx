/**
 * One top-down tug silhouette for the map markers and the landing diagram.
 * Points east (right) at rest, so a heading h renders as rotate(h - 90).
 */
export const TUG_VIEWBOX = "0 0 22 12";
export const TUG_HULL = "M3 1H13Q19 1 21.5 6Q19 11 13 11H3A5 5 0 0 1 3 1Z";
export const TUG_HOUSE = "M5.5 3.5h5a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z";
export const TUG_STACK = { cx: 8.2, cy: 6, r: 1 };

/** Inline SVG markup for DOM markers built outside React. */
export function tugMarkup(): string {
  return (
    `<svg viewBox="${TUG_VIEWBOX}" width="32" height="17" overflow="visible" aria-hidden="true">` +
    `<path class="tug-outline" d="${TUG_HULL}"/>` +
    `<path class="tug-shadow" d="${TUG_HULL}"/>` +
    `<path class="tug-hull" d="${TUG_HULL}"/>` +
    `<path class="tug-house" d="${TUG_HOUSE}"/>` +
    `<circle class="tug-stack" cx="${TUG_STACK.cx}" cy="${TUG_STACK.cy}" r="${TUG_STACK.r}"/>` +
    `</svg>`
  );
}
