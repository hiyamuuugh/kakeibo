export function LoadingSpinner({
  label = "読み込み中...",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center text-sm text-[#9ca3af] ${className}`}>
      <span>{label}</span>
    </div>
  );
}
