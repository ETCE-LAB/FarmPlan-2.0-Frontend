import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { Sidebar } from '@farm/components/shared/Sidebar';
import { TopBar } from '@farm/components/shared/TopBar';
import { ErrorBoundary } from '@farm/components/shared/ErrorBoundary';
import { ConfirmDialogHost } from '@farm/components/shared/ConfirmDialogHost';
import { Toaster } from '@farm/components/shared/Toaster';
import { RequireAuth } from '@farm/components/shared/RequireAuth';
import { loadFarms, resetFarmSync } from '@farm/store/farmSync';
import { useFarmStore } from '@farm/store/useFarmStore';
import { loadModules, useSessionStore } from '@farm/store/useSessionStore';
import OverviewPage from '@farm/pages/OverviewPage';
import FarmListPage from '@farm/pages/FarmListPage';
import PlantsPage from '@farm/pages/PlantsPage';
import PlantDetailPage from '@farm/pages/PlantDetailPage';
import SettingsPage from '@farm/pages/SettingsPage';
import LoginPage from '@farm/pages/LoginPage';
import { useTranslation } from 'react-i18next';
import NotFoundPage from '@farm/pages/NotFoundPage';

const FarmCreatePage = lazy(() => import('@farm/pages/FarmCreatePage'));
const FarmDetailPage = lazy(() => import('@farm/pages/FarmDetailPage'));
const AccountPage = lazy(() => import('@farm/pages/AccountPage'));

const pageFallback = <div className="h-[60vh] rounded-md border border-line bg-surface animate-pulse" />;

/** Loads farms and fields whenever the signed-in account changes; clears them on logout. Token refreshes do not reload. */
function useServerData() {
  const userId = useSessionStore((s) => s.session?.user.id ?? null);
  const isGuest = useSessionStore((s) => s.session?.user.accountType === 'guest');
  useEffect(() => {
    if (!userId || isGuest) {
      resetFarmSync();
      useFarmStore.getState().clearServerData();
    }
    if (!userId) return;
    const controller = new AbortController();
    void loadModules(controller.signal);
    // Guests cannot store farms; asking would only produce a 403.
    if (!isGuest) void loadFarms(controller.signal);
    return () => controller.abort();
  }, [userId, isGuest]);
}

export default function App() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  useServerData();

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-surface-muted font-sans text-ink">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <ErrorBoundary key={pathname}>
            <Suspense fallback={pageFallback}>
              <Routes>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/farms"
                  element={
                    <RequireAuth>
                      <FarmListPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/farms/new"
                  element={
                    <RequireAuth>
                      <FarmCreatePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/farms/:farmId"
                  element={
                    <RequireAuth>
                      <FarmDetailPage />
                    </RequireAuth>
                  }
                />
                <Route path="/plants" element={<PlantsPage />} />
                <Route path="/plants/:plantId" element={<PlantDetailPage />} />
                <Route
                  path="/account"
                  element={
                    <RequireAuth guestTitle={t('account.guestTitle')} guestMessage={t('account.guestNotAvailable')}>
                      <AccountPage />
                    </RequireAuth>
                  }
                />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <ConfirmDialogHost />
      <Toaster />
    </div>
  );
}
