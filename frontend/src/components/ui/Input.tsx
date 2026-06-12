import { cn } from '@/lib/utils';
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-600">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            style={{ colorScheme: 'light' }}
            className={cn(
              'block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm',
              'placeholder:text-slate-400',
              'focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300',
              'disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-slate-400',
              error && 'border-red-400 focus:border-red-400 focus:ring-red-300',
              leftIcon && 'pl-9',
              className,
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
