import { LoaderCircle } from "lucide-react";

export function LoadingSpinner({
  label = "読み込み中...",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center gap-2 text-sm text-[#9ca3af] ${className}`}>
      <LoaderCircle className="h-5 w-5 animate-spin text-[#3b82f6]" />
      <span>{label}</span>
    </div>
  );
}
