
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { emitToast } from "./contexts/ToastContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        if (registration.waiting) {
          emitToast("update", "Update available. Refresh to get the latest version.");
          window.dispatchEvent(new CustomEvent("pwa-update-available"));
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              emitToast("update", "Update available. Refresh to get the latest version.");
              window.dispatchEvent(new CustomEvent("pwa-update-available"));
            }
          });
        });
      })
      .catch((error) => {
        console.warn("Service worker registration failed", error);
      });
  });
}
