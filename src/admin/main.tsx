import { createRoot } from "react-dom/client";
import { AdminApp } from "./AdminApp";

const rootElement = document.getElementById("adminReactAppRoot");

if (!rootElement) {
  throw new Error("Missing Admin React application root");
}

createRoot(rootElement).render(<AdminApp />);
