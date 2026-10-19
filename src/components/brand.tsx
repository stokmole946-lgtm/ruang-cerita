import { Chats } from "@phosphor-icons/react/dist/ssr";
export function Brand({compact=false}:{compact?:boolean}) { return <div className="brand"><span className="brand-mark"><Chats size={28} weight="bold" aria-hidden="true" /></span>{!compact && <div><p className="brand-name">ruang<br/>cerita.</p><p className="brand-class">X SIJA B</p></div>}</div>; }
