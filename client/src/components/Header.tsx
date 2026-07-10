import { ChevronDown, Download, LogOut, Menu, Moon, RefreshCcw, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSidebar } from "../contexts/SidebarContext";
import { useTheme } from "../contexts/ThemeContext";

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleMobileSidebar } = useSidebar();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const isIosSafari =
    /iphone|ipad|ipod/i.test(window.navigator.userAgent) &&
    /safari/i.test(window.navigator.userAgent) &&
    !/crios|fxios|edgios|opr|opera|android/i.test(window.navigator.userAgent);

  useEffect(() => {
    const updateStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    };

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleUpdateAvailable = () => setUpdateAvailable(true);

    updateStandalone();
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", updateStandalone);
    window.addEventListener("pwa-update-available", handleUpdateAvailable);
    window.matchMedia("(display-mode: standalone)").addEventListener("change", updateStandalone);

    navigator.serviceWorker?.getRegistration?.().then((registration) => {
      if (registration) {
        setServiceWorkerRegistration(registration);
        if (registration.waiting) {
          setUpdateAvailable(true);
        }
      }
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", updateStandalone);
      window.removeEventListener("pwa-update-available", handleUpdateAvailable);
      window.matchMedia("(display-mode: standalone)").removeEventListener("change", updateStandalone);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome !== "dismissed") {
      setInstallPrompt(null);
    }
  };

  const handleUpdate = async () => {
    const registration = serviceWorkerRegistration || (await navigator.serviceWorker?.getRegistration?.());
    if (!registration) return;

    await registration.update().catch(() => undefined);

    if (registration.waiting) {
      const waitingWorker = registration.waiting;
      const onStateChange = () => {
        if (waitingWorker.state === "activated") {
          window.location.reload();
        }
      };

      waitingWorker.addEventListener("statechange", onStateChange);
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  return (
    <header className="relative h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-3 sm:px-6 shadow-sm">
      <div className="flex items-center">
        <button
          onClick={toggleMobileSidebar}
          className="md:hidden p-2.5 text-neutral-500 bg-gray-200 hover:bg-neutral-100 rounded-xl transition-all"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {!isStandalone && installPrompt && (
          <button
            onClick={handleInstall}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition-colors"
            title="Install the app on your device"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Install app</span>
          </button>
        )}

        {!isStandalone && isIosSafari && !installPrompt && (
          <button
            onClick={() => setShowIosHint((prev) => !prev)}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold shadow-sm hover:bg-blue-100 transition-colors"
            title="Install on iPhone"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Install on iPhone</span>
            <span className="sm:hidden">iPhone</span>
          </button>
        )}

        {isStandalone && (
          <button
            onClick={handleUpdate}
            disabled={!updateAvailable}
            className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors ${
              updateAvailable
                ? "bg-amber-400 text-slate-900 hover:bg-amber-300"
                : "bg-neutral-200 text-neutral-500 cursor-not-allowed"
            }`}
            title={updateAvailable ? "Update the installed app" : "The app is up to date"}
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="hidden sm:inline">{updateAvailable ? "Update app" : "App installed"}</span>
          </button>
        )}

        {!isStandalone && showIosHint && isIosSafari && (
          <div className="absolute top-16 right-4 z-30 hidden md:block max-w-xs rounded-xl border border-blue-200 bg-white px-4 py-3 shadow-xl">
            <p className="text-sm font-semibold text-neutral-900">Install on iPhone</p>
            <p className="mt-1 text-xs leading-5 text-neutral-600">
              Tap <span className="font-semibold">Share</span>, then choose{" "}
              <span className="font-semibold">Add to Home Screen</span>.
            </p>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="p-2.5 text-neutral-500 bg-gray-200 hover:bg-neutral-100 rounded-xl transition-all"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowDropdown((prev) => !prev)}
            className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-xl hover:bg-neutral-50 transition-all"
          >
            <div className="w-9 h-9 bg-blue-900 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-semibold">{user?.name.charAt(0)}</span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm text-neutral-900 font-semibold">{user?.name}</p>
              <p className="text-xs text-neutral-500 capitalize font-medium">{user?.role}</p>
            </div>
            <ChevronDown className="hidden sm:block w-4 h-4 text-neutral-400" />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-neutral-200 py-2 z-20">
                <div className="px-4 py-3 border-b border-neutral-100">
                  <p className="text-sm text-neutral-900 font-semibold">{user?.name}</p>
                  <p className="text-xs text-neutral-500 font-medium">{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
