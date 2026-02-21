import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { SidebarProvider } from '../contexts/SidebarContext';
import { useTheme } from '../contexts/ThemeContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function Root() {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-linear-to-br from-primary-50 via-white to-accent-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div
        className={`flex h-screen ${
          theme === "dark"
            ? "bg-[radial-gradient(circle_at_top_right,_#111827_0%,_#0b1220_35%,_#0f172a_100%)]"
            : "bg-[radial-gradient(circle_at_top_right,_#dbeafe_0%,_#f8fafc_35%,_#e0f2fe_100%)]"
        }`}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-transparent">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
