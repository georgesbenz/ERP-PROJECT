'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { useRouter } from 'next/navigation';

// permission: undefined  → always visible (Dashboard, Settings)
// permission: 'mod:ACT'  → hidden if the user doesn't have that permission
type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  indent?: boolean;
  permission?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',         label: 'Dashboard',                 icon: LayoutDashboard, exact: true },
  { href: '/pos',               label: 'POS / Caisse',              icon: Monitor,         permission: 'pos:READ' },
  { href: '/inventory',         label: 'Produits',                  icon: Package,         permission: 'inventory:READ', exact: true },
  { href: '/stock',             label: 'Stock',                     icon: Layers,          permission: 'inventory:READ', exact: true },
  { href: '/stock/levels',      label: '  Niveaux de Stock',        icon: BarChart2,       permission: 'inventory:READ', indent: true },
  { href: '/stock/movements',   label: '  Mouvements',              icon: ArrowLeftRight,  permission: 'inventory:READ', indent: true },
  { href: '/stock/adjustments', label: '  Ajustements',             icon: SlidersHorizontal, permission: 'inventory:UPDATE', indent: true },
  { href: '/stock/transfers',   label: '  Transferts',              icon: ArrowRightLeft,  permission: 'inventory:UPDATE', indent: true },
  { href: '/stock/alerts',      label: '  Alertes',                 icon: AlertTriangle,   permission: 'inventory:READ', indent: true },
  { href: '/sales',             label: 'Sales / Ventes',            icon: ShoppingCart,    permission: 'sales:READ' },
  { href: '/customers',         label: 'Customers / Clients',       icon: UsersRound,      permission: 'sales:READ' },
  { href: '/purchases',         label: 'Purchases / Achats',        icon: Truck,           permission: 'purchases:READ' },
  { href: '/suppliers',         label: 'Suppliers / Fournisseurs',  icon: Factory,         permission: 'purchases:READ' },
  { href: '/finance',           label: 'Finance',                   icon: CreditCard,      permission: 'finance:READ' },
  { href: '/crm',               label: 'CRM',                       icon: Users,           permission: 'crm:READ' },
  { href: '/budgeting',         label: 'Budgeting / Budget',        icon: PiggyBank,       permission: 'budgeting:READ' },
  { href: '/analytics',         label: 'Analytics',                 icon: BarChart3,       permission: 'analytics:READ' },
  { href: '/reports',           label: 'Reports / Rapports',        icon: FileBarChart,    permission: 'reports:READ' },
  { href: '/users',             label: 'Users / Utilisateurs',      icon: UserCircle,      permission: 'users:READ' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, permissions, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    logout();
    router.push('/login');
  };

  const visibleItems = NAV_ITEMS.filter(({ permission }) => {
    if (!permission) return true;               // no restriction → always show
    return permissions.includes(permission);   // show only if user has this permission
  });

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
        {visibleItems.map(({ href, label, icon: Icon, exact, indent }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors',
                indent ? 'pl-8 pr-3' : 'px-3',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-stone-50 hover:text-slate-700',
              )}
            >
              <Icon size={indent ? 13 : 15} className={isActive ? 'text-blue-600' : ''} />
              <span className="truncate">{label.trim()}</span>
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
          <span>Settings</span>
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
