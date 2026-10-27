import { Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { Sidebar } from '@farm/components/shared/Sidebar';
import { TopBar } from '@farm/components/shared/TopBar';
import OverviewPage from '@farm/pages/OverviewPage';
import NotFoundPage from '@farm/pages/NotFoundPage';

const pageFallback = <div className="h-[60vh] rounded-md border border-line bg-surface animate-pulse" />;

export default function App() {
  const { pathname } = useLocation();

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-surface-muted font-sans text-ink">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Suspense fallback={pageFallback}>
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
