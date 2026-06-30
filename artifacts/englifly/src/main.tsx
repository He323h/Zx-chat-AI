import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Remove splash screen after React has painted its first frame
// Using two rAF calls guarantees the browser has actually committed the paint
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("splash-hide");
      // Remove from DOM after the CSS transition completes (0.45s)
      setTimeout(() => splash.remove(), 480);
    }
  });
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
