import { ReactNode, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Inbox, RefreshCw, AlertCircle } from "lucide-react";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  searchPlaceholder = "Search records...",
  pageSize = 5,
  onRowClick,
  isLoading = false,
  error = null,
  onRetry,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data based on search term
  const filteredData = data.filter((row) =>
    Object.values(row).some(
      (val) => val && String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="card-static overflow-hidden">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#003366]/20 focus:border-[#003366]"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {isLoading ? (
            <span className="flex items-center gap-1 text-slate-400">
              <RefreshCw size={12} className="animate-spin" /> Loading entries...
            </span>
          ) : (
            <>
              Showing <span className="font-bold text-slate-800">{filteredData.length}</span> entries
            </>
          )}
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-100/70 border-b border-slate-200 font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-4 py-3 ${col.className || ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center">
                  <div className="max-w-xs mx-auto space-y-2">
                    <AlertCircle size={28} className="mx-auto text-rose-500" />
                    <p className="text-xs font-semibold text-slate-800">Failed to load data</p>
                    <p className="text-[11px] text-slate-500">{error}</p>
                    {onRetry && (
                      <button
                        type="button"
                        onClick={onRetry}
                        className="btn-secondary py-1.5 px-3 text-xs font-bold inline-flex items-center gap-1.5 mt-2"
                      >
                        <RefreshCw size={12} /> Retry
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : isLoading ? (
              // Skeleton Loader Rows
              Array.from({ length: pageSize }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="px-4 py-3.5">
                      <div
                        className="h-3.5 bg-slate-200 rounded"
                        style={{ width: `${60 + ((rIdx + cIdx) % 4) * 10}%` }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((col, idx) => (
                    <td key={idx} className={`px-4 py-3 font-medium ${col.className || ""}`}>
                      {typeof col.accessor === "function"
                        ? col.accessor(row)
                        : (row[col.accessor] as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                  <div className="space-y-2">
                    <Inbox size={32} className="mx-auto text-slate-300 stroke-[1.5]" />
                    <p className="text-xs font-medium text-slate-600">No records found</p>
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="text-[11px] text-[#003366] font-bold hover:underline"
                      >
                        Clear search filter
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200/80 flex items-center justify-between bg-slate-50/50 text-xs">
        <span className="text-slate-500 font-medium">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={currentPage === 1 || isLoading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            disabled={currentPage >= totalPages || isLoading}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

