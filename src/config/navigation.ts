import { LayoutDashboard, Settings, Sprout, Tractor, type LucideIcon } from 'lucide-react';
import type { ModuleId } from '@farm/lib/api/modules';

export type NavId = 'overview' | 'farms' | 'plants' | 'settings';

export interface NavItem {
  id: NavId;
  path: string;
  icon: LucideIcon;
  group: 'main' | 'bottom';
  /** Backend module behind the page; hidden when `/v1/modules` reports it as not accessible. */
  module?: ModuleId;

  searchable: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', path: '/', icon: LayoutDashboard, group: 'main', searchable: true },
  { id: 'farms', path: '/farms', icon: Tractor, group: 'main', module: 'farms', searchable: true },
  { id: 'plants', path: '/plants', icon: Sprout, group: 'main', module: 'catalog', searchable: true },
  { id: 'settings', path: '/settings', icon: Settings, group: 'bottom', searchable: false },
];

export function isSearchablePath(pathname: string) {
  return NAV_ITEMS.some((item) => item.searchable && item.path === pathname);
}
