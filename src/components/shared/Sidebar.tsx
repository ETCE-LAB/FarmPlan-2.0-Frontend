import { useEffect } from 'react';
import { Link, NavLink } from 'react-router';
import { Sprout, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS, type NavItem } from '@farm/config/navigation';
import { useUiStore } from '@farm/store/useUiStore';
import { cn } from '@farm/lib/utils';

export function Sidebar() {
  const { t } = useTranslation();
  const open = useUiStore((s) => s.sidebarOpen);
  const setOpen = useUiStore((s) => s.setSidebarOpen);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  const renderItem = ({ id, path, icon: Icon }: NavItem) => (
    <NavLink
      key={id}
      to={path}
      end={path === '/'}
      onClick={close}
      className={({ isActive }) =>
        cn(
          'w-full flex items-center gap-3.5 px-6 py-3.5 text-sm font-medium transition-colors border-l-[5px]',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white',
          isActive
            ? 'bg-brand-700 text-white font-semibold border-white shadow-inner'
            : 'text-white/75 hover:bg-white/5 hover:text-white border-transparent',
        )
      }
    >
      <Icon size={18} className="shrink-0" aria-hidden />
      <span>{t(`nav.${id}.label`)}</span>
    </NavLink>
  );

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" aria-hidden onClick={close} />}
      <aside
        id="app-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-brand-900 text-white flex flex-col shrink-0 select-none shadow-md transition-transform',
          'lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between bg-black/10 border-b border-white/10">
          <Link to="/" onClick={close} className="p-6 block flex-1 hover:bg-black/5 transition">
            <span className="text-2xl font-bold flex items-center gap-2.5 text-white tracking-tight">
              <Sprout size={26} className="text-emerald-300" aria-hidden />
              FarmPlan
            </span>
            <span className="mt-1.5 flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-200 bg-emerald-900/60 px-2 py-0.5 rounded">
                v2.0
              </span>
              <span className="text-[11px] text-white/85">ETCE-LAB</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={close}
            aria-label={t('nav.closeMenu')}
            className="lg:hidden m-3 p-2 rounded text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <nav aria-label={t('nav.main')} className="py-4 flex-1 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.filter((i) => i.group === 'main').map(renderItem)}
        </nav>
        <nav aria-label={t('nav.secondary')} className="py-4 border-t border-white/10">
          {NAV_ITEMS.filter((i) => i.group === 'bottom').map(renderItem)}
        </nav>
      </aside>
    </>
  );
}
