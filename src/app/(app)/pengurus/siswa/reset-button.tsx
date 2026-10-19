"use client";

import { ArrowClockwise } from "@phosphor-icons/react";

export function ResetButton({ studentName }: { studentName: string }) {
  return (
    <button
      className="btn-danger !min-h-[38px] !py-1 !px-3 text-xs flex items-center gap-1"
      type="submit"
      onClick={(e) => {
        if (!window.confirm(`Reset password ${studentName} kembali ke "123"?`)) {
          e.preventDefault();
        }
      }}
      title="Kembalikan password ke 123 dan paksa ganti saat login berikutnya"
    >
      <ArrowClockwise size={14} weight="bold" />
      Reset ke 123
    </button>
  );
}
