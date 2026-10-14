import { createRoot } from "react-dom/client";
import { PosApp } from "./PosApp";

const root = document.getElementById("posReactRoot");
if (!root) throw new Error("Missing POS React application root");
createRoot(root).render(<PosApp />);

/* iOS Safari may ignore viewport user-scalable=no. Prevent multi-touch
   page zoom while preserving ordinary one-finger scrolling and taps. */
if (typeof document !== "undefined") {
  document.addEventListener("gesturestart", (event) => event.preventDefault(), { passive: false });
  document.addEventListener("gesturechange", (event) => event.preventDefault(), { passive: false });
  document.addEventListener("gestureend", (event) => event.preventDefault(), { passive: false });
  document.addEventListener("touchmove", (event) => {
    if (event.touches.length > 1) event.preventDefault();
  }, { passive: false });
}
