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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';

type NavLeaf = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  permission?: string;
};

type NavGroup = {
  type: 'group';
  label: string;
  icon: React.ElementType;
  permission?: string;
  // used to auto-expand when any child is active
  basePath: string;
  children: NavLeaf[];
};

type NavItem = NavLeaf | NavGroup;

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',   label: 'Dashboard',               icon: LayoutDashboard, exact: true },
  { href: '/pos',         label: 'POS / Caisse',            icon: Monitor,         permission: 'pos:READ' },
  { href: '/inventory',   label: 'Produits',                icon: Package,         permission: 'inventory:READ', exact: true },
  {
    type: 'group',
    label: 'Stock',
    icon: Layers,
    permission: 'inventory:READ',
    basePath: '/stock',
    children: [
      { href: '/stock',             label: 'Vue d\'ensemble',    icon: Layers,            permission: 'inventory:READ', exact: true },
      { href: '/stock/levels',      label: 'Niveaux de Stock',   icon: BarChart2,          permission: 'inventory:READ' },
      { href: '/stock/movements',   label: 'Mouvements',         icon: ArrowLeftRight,     permission: 'inventory:READ' },
      { href: '/stock/adjustments', label: 'Ajustements',        icon: SlidersHorizontal,  permission: 'inventory:UPDATE' },
      { href: '/stock/transfers',   label: 'Transferts',         icon: ArrowRightLeft,     permission: 'inventory:UPDATE' },
      { href: '/stock/alerts',      label: 'Alertes Stock',      icon: AlertTriangle,      permission: 'inventory:READ' },
    ],
  },
  { href: '/sales',       label: 'Sales / Ventes',          icon: ShoppingCart,    permission: 'sales:READ' },
  { href: '/customers',   label: 'Clients',                 icon: UsersRound,      permission: 'sales:READ' },
  { href: '/purchases',   label: 'Achats',                  icon: Truck,           permission: 'purchases:READ' },
  { href: '/suppliers',   label: 'Fournisseurs',            icon: Factory,         permission: 'purchases:READ' },
  { href: '/finance',     label: 'Finance',                 icon: CreditCard,      permission: 'finance:READ' },
  { href: '/crm',         label: 'CRM',                     icon: Users,           permission: 'crm:READ' },
  { href: '/budgeting',   label: 'Budget',                  icon: PiggyBank,       permission: 'budgeting:READ' },
  { href: '/analytics',   label: 'Analytics',               icon: BarChart3,       permission: 'analytics:READ' },
  { href: '/reports',     label: 'Rapports',                icon: FileBarChart,    permission: 'reports:READ' },
  { href: '/users',       label: 'Utilisateurs',            icon: UserCircle,      permission: 'users:READ' },
];

function isGroup(item: NavItem): item is NavGroup {
  return (item as NavGroup).type === 'group';
}

export function Sidebar() {
  const pathname  = usePathname();
  const { user, permissions, logout } = useAuthStore();
  const router    = useRouter();

  // Track which groups are open; auto-open if a child is active
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const item of NAV_ITEMS) {
      if (isGroup(item)) {
        init[item.basePath] = pathname.startsWith(item.basePath);
      }
    }
    return init;
  });

  // Re-evaluate when pathname changes (e.g. direct navigation)
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
  }, [pathname]);

  const toggleGroup = (basePath: string) =>
    setOpenGroups((prev) => ({ ...prev, [basePath]: !prev[basePath] }));

  const hasPermission = (perm?: string) => !perm || permissions.includes(perm);

  const handleLogout = async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    logout();
    router.push('/login');
  };

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-stone-200 bg-white">
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
                  <span className="flex-1 truncate text-left">{item.label}</span>
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
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // ── Leaf link ────────────────────────────────────────────────────
          const { href, label, icon: Icon, exact } = item as NavLeaf;
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
              <span className="truncate">{label}</span>
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
          <span>Paramètres</span>
        </Link>
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 flex-shrink-0">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <span className="flex-1 truncate text-slate-600">{user?.firstName} {user?.lastName}</span>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition-colors">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
