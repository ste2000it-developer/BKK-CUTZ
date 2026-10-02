import { createRoot } from "react-dom/client";
import { PosApp } from "./PosApp";

const root = document.getElementById("posReactRoot");
if (!root) throw new Error("Missing POS React application root");
createRoot(root).render(<PosApp />);
