export function Notice({ error, success }: { error?: string; success?: string }) {
  const text = error || success;
  if (!text) return null;
  return (
    <div
      role="status"
      className={`border-2 border-[#20201e] px-4 py-3 text-sm font-bold shadow-[3px_3px_0_#20201e] rounded-[7px] ${
        error ? "bg-[#ffa18b] text-[#3d140e]" : "bg-[#b9e2ce] text-[#113a27]"
      }`}
    >
      {text}
    </div>
  );
}
