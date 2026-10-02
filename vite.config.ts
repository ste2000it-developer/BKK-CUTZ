import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  base: "/BKK-CUTZ/",
  plugins: [react()],
  optimizeDeps: {
    include: [
      "react",
      "react-dom/client",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "firebase/storage",
    ],
  },
  build: {
    rollupOptions: {
      input: {
        pos: `${projectRoot}index.html`,
        admin: `${projectRoot}admin.html`,
      },
    },
  },
  test: {
    environment: "node",
  },
});