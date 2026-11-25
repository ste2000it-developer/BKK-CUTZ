/**
 * Shared dropdown/calendar geometry. Keeping positioning in one place makes
 * the same control behave consistently when iOS shrinks the visual viewport.
 */
export type PanelPlacement = { openAbove: boolean; maxHeight: number };

export function floatingPanelPlacement(
  anchor: { top: number; bottom: number },
  viewport: { top: number; bottom: number },
  preferredHeight: number,
  gap = 9,
): PanelPlacement {
  const margin = 10;
  const above = Math.max(0, anchor.top - viewport.top - gap - margin);
  const below = Math.max(0, viewport.bottom - anchor.bottom - gap - margin);
  const openAbove = below < preferredHeight && above > below;
  const available = openAbove ? above : below;
  return {
    openAbove,
    maxHeight: Math.max(44, Math.min(preferredHeight, available)),
  };
}

export function visualViewportBounds() {
  const view = window.visualViewport;
  const top = view?.offsetTop ?? 0;
  return {
    top,
    bottom: top + (view?.height ?? window.innerHeight),
  };
}
