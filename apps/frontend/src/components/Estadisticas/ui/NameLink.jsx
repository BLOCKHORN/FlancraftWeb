import { cn } from "../leaderboards.utils";
import "./NameLink.scss";
export default function NameLink({ player, className, onOpen }) {
  const name = player?.nombre_minecraft;
  if (!name) return null;

  return (
    <button
      type="button"
      className={cn("lb-nameLink", className)}
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.(player);
      }}
      title="Abrir perfil"
    >
      {name}
      <span className="lb-nameLink__u" />
    </button>
  );
}
