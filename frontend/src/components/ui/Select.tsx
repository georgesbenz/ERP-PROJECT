import { cn } from '@/lib/utils';
import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-slate-600">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          style={{ colorScheme: 'light' }}
          className={cn(
            'block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm',
            'focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300',
            'disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-slate-400',
            error && 'border-red-400 focus:border-red-400 focus:ring-red-300',
            className,
          )}
          {...props}
        >
          {placeholder && <option value="" style={{ background: '#fff', color: '#1e293b' }}>{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ background: '#fff', color: '#1e293b' }}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';
