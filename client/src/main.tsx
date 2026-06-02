
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { emitToast } from "./contexts/ToastContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        registration.update().catch(() => undefined);

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
