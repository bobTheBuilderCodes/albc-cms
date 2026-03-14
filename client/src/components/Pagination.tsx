import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  totalItems: number;
}

export function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 sm:py-4 border-t border-neutral-200 bg-neutral-50 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="hidden sm:block text-sm text-neutral-600 dark:text-slate-300 font-medium">
        Showing <span className="font-semibold text-neutral-900 dark:text-slate-100">{startItem}</span> to{' '}
        <span className="font-semibold text-neutral-900 dark:text-slate-100">{endItem}</span> of{' '}
        <span className="font-semibold text-neutral-900 dark:text-slate-100">{totalItems}</span> results
      </div>

      <div className="sm:hidden text-xs text-neutral-600 dark:text-slate-300 font-medium">
        Page <span className="font-semibold text-neutral-900 dark:text-slate-100">{currentPage}</span> of{' '}
        <span className="font-semibold text-neutral-900 dark:text-slate-100">{totalPages}</span>
      </div>
      
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-2 border border-neutral-300 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm text-neutral-700 dark:text-slate-200"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' ? onPageChange(page) : null}
              disabled={page === '...'}
              className={`min-w-9 h-9 sm:min-w-10 sm:h-10 flex items-center justify-center rounded-lg transition-colors text-xs sm:text-sm ${
                page === currentPage
                  ? 'bg-primary-600 text-white font-semibold'
                  : page === '...'
                  ? 'cursor-default text-neutral-400 dark:text-slate-500'
                  : 'border border-neutral-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-neutral-700 dark:text-slate-200'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center gap-1 px-2.5 sm:px-3 py-2 border border-neutral-300 dark:border-slate-700 rounded-lg hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm text-neutral-700 dark:text-slate-200"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
