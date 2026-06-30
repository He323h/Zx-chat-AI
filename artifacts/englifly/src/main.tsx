import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Remove the HTML splash as soon as React paints its first frame.
// The React SplashScreen component renders underneath and takes over seamlessly —
// both share the same gradient, so the handoff is invisible to the user.
requestAnimationFrame(() => {
  const splash = document.getElementById("splash");
  if (splash) {
    splash.classList.add("splash-hide");
    setTimeout(() => splash.remove(), 320);
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
