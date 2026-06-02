import { ChevronDown, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useSidebar } from "../contexts/SidebarContext";
import { useTheme } from "../contexts/ThemeContext";

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleMobileSidebar } = useSidebar();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-3 sm:px-6 shadow-sm">
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
