import { useLocation } from 'react-router';
import { Menu, User } from 'lucide-react';

export function TopBar() {
  const { pathname } = useLocation();

  return (
    <header className="h-16 bg-surface border-b border-line px-4 lg:px-8 flex items-center justify-between gap-3 sm:gap-6 shrink-0 z-10">
      <button
        type="button"
        aria-controls="app-sidebar"
        className="lg:hidden p-2 -ml-2 rounded text-ink-soft hover:text-ink hover:bg-surface-sunken cursor-pointer"
      >
        <Menu size={20} aria-hidden />
      </button>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          className="p-2 rounded-full text-ink-muted hover:text-ink hover:bg-surface-sunken transition cursor-pointer focus-visible:outline-2 focus-visible:outline-brand-700"
        ></button>

        <div className="flex items-center gap-3 sm:pl-4 sm:border-l border-line">
          <div className="text-right leading-tight hidden md:block">
            <div className="text-sm font-semibold text-ink flex items-center gap-2 justify-end">Hans</div>
            <div className="text-xs text-ink-muted">Admin</div>
          </div>
          <div
            className="w-9 h-9 rounded-full bg-brand-50 border border-line flex items-center justify-center text-brand-fg"
            title="Hans"
          >
            <User size={18} aria-hidden />
          </div>
        </div>
      </div>
    </header>
  );
}
