import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

// shadcn themes off a `.dark` class, so mirror the OS setting onto <html>.
const dark = window.matchMedia("(prefers-color-scheme: dark)");
const applyTheme = (matches: boolean) =>
  document.documentElement.classList.toggle("dark", matches);

applyTheme(dark.matches);
dark.addEventListener("change", (event) => applyTheme(event.matches));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
