"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-borderLight">
      <p className="text-xs text-muted2">
        Página {page} de {totalPages}
        {typeof total === "number" ? ` · ${total} en total` : ""}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-borderLight text-ink2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper transition-colors"
          title="Página anterior"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-md border border-borderLight text-ink2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-paper transition-colors"
          title="Página siguiente"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
