import React, { useState, useEffect } from "react";
import { Copy } from "lucide-react";
import "../../styles/components/Landpage/_serverstatus.scss";

const IP = "play.flancraft.com";
const BEDROCK_PORT = "19132";

const ServerStatus = () => {
  const [copiedIP, setCopiedIP] = useState(false);
  const [copiedPort, setCopiedPort] = useState(false);
  const [serverStatus, setServerStatus] = useState("offline");
  const [playersOnline, setPlayersOnline] = useState(0);
  const [playerDelta, setPlayerDelta] = useState(0);
  const [showDelta, setShowDelta] = useState(false);

  const copyText = (text, setCopiedState) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 1800);
  };

  const fetchServerStatus = async () => {
    try {
      const res = await fetch(`https://api.mcsrvstat.us/2/${IP}`);
      const data = await res.json();
      const newPlayersCount = data.players?.online || 0;

      setServerStatus(data.online ? "online" : "offline");

      setPlayersOnline((prevCount) => {
        if (prevCount > 0 && newPlayersCount !== prevCount) {
          setPlayerDelta(newPlayersCount - prevCount);
          setShowDelta(true);
          setTimeout(() => setShowDelta(false), 8000);
        }
        return newPlayersCount;
      });
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
    <div className={`hud-status ${isOnline ? "is-online" : "is-offline"} no-tap-highlight`}>
      <div className="hud-status__main">
        <button 
          className="hud-ip-btn" 
          onClick={() => copyText(IP, setCopiedIP)}
          title="Copiar IP Java"
        >
          <div className="hud-dot-wrap">
            <div className="hud-ping"></div>
            <div className="hud-dot"></div>
          </div>
          <span className="hud-ip-text">{copiedIP ? "¡IP COPIADA!" : IP}</span>
          <Copy size={16} className={`hud-copy-icon ${copiedIP ? "copied" : ""}`} />
        </button>

        <div className="hud-divider"></div>

        <div className="hud-players">
          <span className="hud-count">{isOnline ? playersOnline : "--"}</span>
          <span className="hud-lbl">{isOnline ? "ONLINE" : "OFFLINE"}</span>
          <span className={`hud-delta ${showDelta ? 'is-visible' : ''} ${playerDelta > 0 ? 'is-up' : 'is-down'}`}>
            {playerDelta > 0 ? `+${playerDelta}` : playerDelta}
          </span>
        </div>
      </div>

      <button 
        className="hud-bedrock-btn" 
        onClick={() => copyText(BEDROCK_PORT, setCopiedPort)}
        title="Copiar Puerto Bedrock"
      >
        <span className="b-label">¿BEDROCK? PUERTO:</span>
        <span className="b-port">{copiedPort ? "¡COPIADO!" : BEDROCK_PORT}</span>
        <Copy size={12} className={`b-copy-icon ${copiedPort ? "copied" : ""}`} />
      </button>
    </div>
  );
};

export default ServerStatus;