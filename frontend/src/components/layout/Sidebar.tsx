'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  CreditCard,
  Users,
  BarChart3,
  PiggyBank,
  UserCircle,
  Settings,
  LogOut,
  Building2,
  Monitor,
  FileBarChart,
  UsersRound,
  Factory,
  ArrowLeftRight,
  Layers,
  BarChart2,
  SlidersHorizontal,
  ArrowRightLeft,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Receipt,
  ClipboardList,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/sidebar.store';
import { authService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';
import { useT } from '@/hooks/useT';

type NavLeaf = {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  exact?: boolean;
  permission?: string;
};

type NavGroup = {
  type: 'group';
  labelKey: string;
  icon: React.ElementType;
  permission?: string;
  basePath: string;
  children: NavLeaf[];
};

type NavItem = NavLeaf | NavGroup;

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',   labelKey: 'nav.dashboard',       icon: LayoutDashboard, exact: true },
  { href: '/pos',         labelKey: 'nav.pos',             icon: Monitor,         permission: 'pos:READ' },
  { href: '/inventory',   labelKey: 'nav.products',        icon: Package,         permission: 'inventory:READ', exact: true },
  {
    type: 'group',
    labelKey: 'nav.stock',
    icon: Layers,
    permission: 'inventory:READ',
    basePath: '/stock',
    children: [
      { href: '/stock',             labelKey: 'nav.stockOverview',    icon: Layers,            permission: 'inventory:READ', exact: true },
      { href: '/stock/levels',      labelKey: 'nav.stockLevels',      icon: BarChart2,          permission: 'inventory:READ' },
      { href: '/stock/movements',   labelKey: 'nav.stockMovements',   icon: ArrowLeftRight,     permission: 'inventory:READ' },
      { href: '/stock/adjustments', labelKey: 'nav.stockAdjustments', icon: SlidersHorizontal,  permission: 'inventory:UPDATE' },
      { href: '/stock/transfers',   labelKey: 'nav.stockTransfers',   icon: ArrowRightLeft,     permission: 'inventory:UPDATE' },
      { href: '/stock/alerts',      labelKey: 'nav.stockAlerts',      icon: AlertTriangle,      permission: 'inventory:READ' },
      { href: '/stock/count',       labelKey: 'nav.stockCount',       icon: ClipboardList,      permission: 'inventory:UPDATE' },
      { href: '/stock/reorder',     labelKey: 'nav.stockReorder',     icon: ShoppingBag,        permission: 'inventory:READ' },
    ],
  },
  { href: '/sales',       labelKey: 'nav.sales',           icon: ShoppingCart,    permission: 'sales:READ' },
  { href: '/customers',   labelKey: 'nav.customers',       icon: UsersRound,      permission: 'sales:READ' },
  { href: '/purchases',   labelKey: 'nav.purchases',       icon: Truck,           permission: 'purchases:READ' },
  { href: '/suppliers',   labelKey: 'nav.suppliers',       icon: Factory,         permission: 'purchases:READ' },
  { href: '/expenses',    labelKey: 'nav.expenses',        icon: Receipt,         permission: 'expenses:READ' },
  { href: '/finance',     labelKey: 'nav.finance',         icon: CreditCard,      permission: 'finance:READ' },
  { href: '/crm',         labelKey: 'nav.crm',             icon: Users,           permission: 'crm:READ' },
  { href: '/budgeting',   labelKey: 'nav.budgeting',       icon: PiggyBank,       permission: 'budgeting:READ' },
  { href: '/analytics',   labelKey: 'nav.analytics',       icon: BarChart3,       permission: 'analytics:READ' },
  { href: '/reports',     labelKey: 'nav.reports',         icon: FileBarChart,    permission: 'reports:READ' },
  { href: '/assistant',   labelKey: 'nav.assistant',       icon: Sparkles },
  { href: '/users',       labelKey: 'nav.users',           icon: UserCircle,      permission: 'users:READ' },
];

function isGroup(item: NavItem): item is NavGroup {
  return (item as NavGroup).type === 'group';
}

export function Sidebar() {
  const pathname  = usePathname();
  const { user, permissions, logout } = useAuthStore();
  const { isOpen, close } = useSidebarStore();
  const router    = useRouter();
  const { t }     = useT();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const item of NAV_ITEMS) {
      if (isGroup(item)) {
        init[item.basePath] = pathname.startsWith(item.basePath);
      }
    }
    return init;
  });

  useEffect(() => {
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const item of NAV_ITEMS) {
        if (isGroup(item) && pathname.startsWith(item.basePath)) {
          next[item.basePath] = true;
        }
      }
      return next;
    });
    close(); // close mobile drawer on navigation
  }, [pathname, close]);

  const toggleGroup = (basePath: string) =>
    setOpenGroups((prev) => ({ ...prev, [basePath]: !prev[basePath] }));

  const hasPermission = (perm?: string) => !perm || permissions.includes(perm);

  const handleLogout = async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={close}
        />
      )}
      <aside className={cn(
        'flex h-screen w-60 flex-shrink-0 flex-col border-r border-stone-200 bg-white',
        'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
        'lg:static lg:translate-x-0 lg:z-auto',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-stone-100 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Building2 size={16} className="text-white" />
        </div>
        <span className="font-semibold text-slate-800 text-sm leading-tight">
          ERP<br />
          <span className="text-xs font-normal text-slate-400">Platform</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          if (!hasPermission(item.permission)) return null;

          // ── Group (collapsible) ──────────────────────────────────────────
          if (isGroup(item)) {
            const isOpen        = openGroups[item.basePath] ?? false;
            const isChildActive = item.children.some((c) =>
              c.exact ? pathname === c.href : pathname.startsWith(c.href),
            );
            const Icon = item.icon;

            return (
              <div key={item.basePath}>
                <button
                  type="button"
                  onClick={() => toggleGroup(item.basePath)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isChildActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-500 hover:bg-stone-50 hover:text-slate-700',
                  )}
                >
                  <Icon size={15} className={isChildActive ? 'text-blue-600' : ''} />
                  <span className="flex-1 truncate text-left">{t(item.labelKey)}</span>
                  {isOpen
                    ? <ChevronDown size={13} className="flex-shrink-0 opacity-60" />
                    : <ChevronRight size={13} className="flex-shrink-0 opacity-40" />}
                </button>

                {isOpen && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-stone-200 pl-3">
                    {item.children.map((child) => {
                      if (!hasPermission(child.permission)) return null;
                      const isActive = child.exact
                        ? pathname === child.href
                        : pathname.startsWith(child.href);
                      const CIcon = child.icon;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                            isActive
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-slate-500 hover:bg-stone-50 hover:text-slate-700',
                          )}
                        >
                          <CIcon size={12} className={isActive ? 'text-blue-600' : ''} />
                          <span className="truncate">{t(child.labelKey)}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // ── Leaf link ────────────────────────────────────────────────────
          const { href, labelKey, icon: Icon, exact } = item as NavLeaf;
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-stone-50 hover:text-slate-700',
              )}
            >
              <Icon size={15} className={isActive ? 'text-blue-600' : ''} />
              <span className="truncate">{t(labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="border-t border-stone-100 px-3 py-3 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-stone-50 hover:text-slate-700 transition-colors"
        >
          <Settings size={15} />
          <span>{t('nav.settings')}</span>
        </Link>
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <span className="flex-1 truncate text-slate-600">{user?.firstName} {user?.lastName}</span>
          <button onClick={handleLogout} title={t('nav.logout')} className="text-slate-400 hover:text-rose-500 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
