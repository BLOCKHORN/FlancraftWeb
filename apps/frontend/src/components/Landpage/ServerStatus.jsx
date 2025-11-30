import React, { useState, useEffect } from "react";
import { Copy } from "lucide-react";
import "../../styles/components/Landpage/_serverstatus.scss";

const IP = "play.flancraft.com";

const ServerStatus = () => {
  const [copied, setCopied] = useState(false);
  const [serverStatus, setServerStatus] = useState("offline");
  const [playersOnline, setPlayersOnline] = useState(0);

  const copyIP = () => {
    navigator.clipboard.writeText(IP);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const fetchServerStatus = async () => {
    try {
      const res = await fetch(`https://api.mcsrvstat.us/2/${IP}`);
      const data = await res.json();

      setServerStatus(data.online ? "online" : "offline");
      setPlayersOnline(data.players?.online || 0);
    } catch {
      setServerStatus("offline");
      setPlayersOnline(0);
    }
  };

  useEffect(() => {
    fetchServerStatus();
    const interval = setInterval(fetchServerStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const isOnline = serverStatus === "online";
  const playersLabel = isOnline ? "jugadores conectados" : "servidor en mantenimiento";

  return (
    <div className={`server-status-minimal ${isOnline ? "online" : "offline"}`}>
      {/* Línea difuminada superior (sin bolita) */}
      <div className="ss-line">
        <span className="ss-line-segment ss-line-segment--left" />
        <span className="ss-line-segment ss-line-segment--right" />
      </div>

      {/* IP · bolita estado · players */}
      <div className="ss-row">
        <button
          type="button"
          className="ss-ip-trigger"
          onClick={copyIP}
          title="Copiar IP del servidor"
        >
          <span className="ss-ip-text">{IP}</span>
          <Copy size={15} className="ss-ip-icon" />
        </button>

        <span className="ss-status-dot" aria-hidden="true" />

        <span className="ss-players-label">
          <span className="ss-players-count">
            {isOnline ? playersOnline : "--"}
          </span>
          <span className="ss-players-text">{playersLabel}</span>
        </span>
      </div>

      <span className={`ss-copy-hint ${copied ? "visible" : ""}`}>
        {copied ? "¡IP copiada al portapapeles!" : "Haz clic en la IP para copiarla"}
      </span>
    </div>
  );
};

export default ServerStatus;
