import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

// Maps common status strings to badge variants
export function statusVariant(status: string): BadgeVariant {
  const s = status?.toUpperCase();
  if (['CONFIRMED', 'ACTIVE', 'APPROVED', 'CONVERTED', 'WON', 'RECEIVED', 'COMPLETED'].includes(s)) return 'success';
  if (['PENDING', 'DRAFT', 'PENDING_APPROVAL', 'NEW', 'ORDERED'].includes(s)) return 'warning';
  if (['CANCELLED', 'LOST', 'INACTIVE', 'CLOSED'].includes(s)) return 'danger';
  if (['OPEN', 'CONTACTED', 'QUALIFIED', 'ON_HOLD'].includes(s)) return 'info';
  return 'default';
}
