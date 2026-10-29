import { useLocation } from 'react-router';
import { Globe, Menu, Moon, Search, Sun, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFarmStore } from '@farm/store/useFarmStore';
import { useUiStore } from '@farm/store/useUiStore';
import { DemoBadge } from '@farm/components/ui/Badge';
import { isSearchablePath } from '@farm/config/navigation';
import { useSearchParam } from '@farm/lib/useSearchParam';
import { cn } from '@farm/lib/utils';
import { useIsDark } from '@farm/theme';
import type { Language } from '@farm/types';

const LANGUAGES: Language[] = ['de', 'en'];

function SearchInput() {
  const { t } = useTranslation();
  const [query, setQuery] = useSearchParam('q');
  return (
    <div className="relative w-full max-w-96">
      <Search
        size={16}
        aria-hidden
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none"
      />
      <input
        type="search"
        aria-label={t('common.search')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('topBar.searchPlaceholder')}
        className="w-full bg-surface-muted border border-line rounded-md pl-10 pr-4 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand-700 focus:ring-1 focus:ring-brand-700 transition"
      />
    </div>
  );
}

export function TopBar() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const language = useFarmStore((s) => s.language);
  const setLanguage = useFarmStore((s) => s.setLanguage);
  const user = useFarmStore((s) => s.currentUser);
  const setTheme = useFarmStore((s) => s.setTheme);
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const isDark = useIsDark();

  return (
    <header className="h-16 bg-surface border-b border-line px-4 lg:px-8 flex items-center justify-between gap-3 sm:gap-6 shrink-0 z-10">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label={t('nav.openMenu')}
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
        className="lg:hidden p-2 -ml-2 rounded text-ink-soft hover:text-ink hover:bg-surface-sunken cursor-pointer"
      >
        <Menu size={20} aria-hidden />
      </button>

      <div className="flex-1 min-w-0">{isSearchablePath(pathname) && <SearchInput />}</div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? t('topBar.toLight') : t('topBar.toDark')}
          title={isDark ? t('topBar.toLight') : t('topBar.toDark')}
          className="p-2 rounded-full text-ink-muted hover:text-ink hover:bg-surface-sunken transition cursor-pointer focus-visible:outline-2 focus-visible:outline-brand-700"
        >
          {isDark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
        </button>

        <fieldset className="flex items-center gap-1 sm:gap-2 bg-surface-muted border border-line rounded-full p-1 text-xs">
          <legend className="sr-only">{t('common.language')}</legend>
          <Globe size={14} aria-hidden className="text-ink-muted ml-1.5 hidden sm:block" />
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              aria-pressed={language === lang}
              onClick={() => setLanguage(lang)}
              className={cn(
                'px-2.5 py-0.5 rounded-full font-semibold uppercase transition cursor-pointer',
                language === lang ? 'bg-brand-700 text-white shadow-xs' : 'text-ink-soft hover:text-ink',
              )}
            >
              {lang}
            </button>
          ))}
        </fieldset>

        <div className="flex items-center gap-3 sm:pl-4 sm:border-l border-line">
          <div className="text-right leading-tight hidden md:block">
            <div className="text-sm font-semibold text-ink flex items-center gap-2 justify-end">
              {user.username}
              <DemoBadge />
            </div>
            <div className="text-xs text-ink-muted">{t(`topBar.roles.${user.role}`)}</div>
          </div>
          <div
            className="w-9 h-9 rounded-full bg-brand-50 border border-line flex items-center justify-center text-brand-fg"
            title={user.username}
          >
            <User size={18} aria-hidden />
          </div>
        </div>
      </div>
    </header>
  );
}
