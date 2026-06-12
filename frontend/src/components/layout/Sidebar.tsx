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

const navItems = [
  { href: '/dashboard',            label: 'Dashboard',                icon: LayoutDashboard, exact: true },
  { href: '/pos',                  label: 'POS / Caisse',             icon: Monitor },
  { href: '/inventory',            label: 'Produits',                 icon: Package,         exact: true },
  { href: '/stock',                label: 'Stock',                    icon: Layers,          exact: true },
  { href: '/stock/levels',         label: '  Niveaux de Stock',       icon: BarChart2,       indent: true },
  { href: '/stock/movements',      label: '  Mouvements',             icon: ArrowLeftRight,  indent: true },
  { href: '/stock/adjustments',    label: '  Ajustements',            icon: SlidersHorizontal, indent: true },
  { href: '/stock/transfers',      label: '  Transferts',             icon: ArrowRightLeft,  indent: true },
  { href: '/stock/alerts',         label: '  Alertes',                icon: AlertTriangle,   indent: true },
  { href: '/sales',                label: 'Sales / Ventes',           icon: ShoppingCart },
  { href: '/customers',            label: 'Customers / Clients',      icon: UsersRound },
  { href: '/purchases',            label: 'Purchases / Achats',       icon: Truck },
  { href: '/suppliers',            label: 'Suppliers / Fournisseurs', icon: Factory },
  { href: '/finance',              label: 'Finance',                  icon: CreditCard },
  { href: '/crm',                  label: 'CRM',                      icon: Users },
  { href: '/budgeting',            label: 'Budgeting / Budget',       icon: PiggyBank },
  { href: '/analytics',            label: 'Analytics',                icon: BarChart3 },
  { href: '/reports',              label: 'Reports / Rapports',       icon: FileBarChart },
  { href: '/users',                label: 'Users / Utilisateurs',     icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    logout();
    router.push('/login');
  };

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
        <Building2 size={22} className="text-indigo-600" />
        <span className="font-bold text-gray-900 text-sm leading-tight">
          ERP<br />
          <span className="text-xs font-normal text-gray-400">Platform</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact, indent }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors',
                indent ? 'pl-8 pr-3' : 'px-3',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Icon size={indent ? 14 : 16} />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="border-t border-gray-100 px-3 py-3 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <Settings size={16} />
          <span>Settings</span>
        </Link>
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <span className="flex-1 truncate">{user?.firstName} {user?.lastName}</span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
