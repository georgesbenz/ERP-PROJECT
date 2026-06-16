import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationMeta } from '@/lib/api';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (meta.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3">
      <p className="text-sm text-slate-500">
        Showing {(meta.page - 1) * meta.limit + 1}–
        {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
      </p>
      <div className="flex gap-1">
        <button
          disabled={!meta.hasPrev}
          onClick={() => onPageChange(meta.page - 1)}
          className="rounded p-1.5 text-slate-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="flex items-center px-3 text-sm text-slate-700">
          {meta.page} / {meta.totalPages}
        </span>
        <button
          disabled={!meta.hasNext}
          onClick={() => onPageChange(meta.page + 1)}
          className="rounded p-1.5 text-slate-500 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
