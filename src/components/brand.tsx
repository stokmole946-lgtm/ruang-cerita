import { Chats } from "@phosphor-icons/react/dist/ssr";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Chats size={22} weight="fill" aria-hidden="true" />
      </span>
      {!compact && (
        <div className="leading-tight">
          <p className="brand-name">
            ruang<span>cerita</span>
          </p>
          <p className="brand-class">X SIJA B</p>
        </div>
      )}
    </div>
  );
}
