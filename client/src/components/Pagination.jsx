const buttonClass =
  "rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white";

function Pagination({ page, totalPages, onPageChange }) {
  return (
    <div className="mt-10 flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={buttonClass}
      >
        Previous
      </button>
      <span className="text-sm text-slate-600">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={buttonClass}
      >
        Next
      </button>
    </div>
  );
}

export default Pagination;
