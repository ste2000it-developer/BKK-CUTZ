import { useEffect, type RefObject } from "react";

/**
 * Shared native-dialog behavior for Admin edit forms and read-only details.
 * Keeps the underlying page in place on mobile Safari as well as desktop.
 * The dialog content owns any internal scrolling, not the body.
 */
export function useAdminDialog(ref: RefObject<HTMLDialogElement | null>, isOpen: boolean) {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!isOpen) {
      if (dialog.open) dialog.close();
      return;
    }

    if (!dialog.open) dialog.showModal();

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      if (dialog.open) dialog.close();
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [ref, isOpen]);
}
