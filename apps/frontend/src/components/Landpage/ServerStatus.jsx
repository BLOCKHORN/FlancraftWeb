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
    setTimeout(() => setCopied(false), 2000);
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

  return (
    <div className={`server-status-bar ${serverStatus}`}>
      <div className="status-inner">
        {/* Lado izquierdo: estado del mundo */}
        <div className="status-left">
          <span className="status-pill">
            <span className="status-dot" />
            {isOnline ? "Servidor activo" : "Servidor offline"}
          </span>
        </div>

        {/* Centro: IP + botón copiar */}
        <div className="status-center">
          <button
            className="ip-button"
            onClick={copyIP}
            title="Copiar IP del servidor"
          >
            <span className="ip-text">{IP}</span>
            <Copy size={16} />
          </button>
        </div>

        {/* Derecha: jugadores */}
        <div className="status-right">
          {isOnline ? (
            <span className="players-pill">
              <span className="players-led" />
              {playersOnline} jugadores conectados
            </span>
          ) : (
            <span className="players-pill players-pill-offline">
              En mantenimiento
            </span>
          )}
        </div>
      </div>

      {copied && <span className="copied-text">IP copiada</span>}
    </div>
  );
};

export default ServerStatus;
