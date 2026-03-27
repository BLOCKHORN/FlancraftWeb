import React, { useState, useEffect } from "react";
import { Copy, Crown, Skull, Box } from "lucide-react";
import { FaWindows, FaApple, FaAndroid, FaPlaystation, FaXbox } from "react-icons/fa";
import { SiNintendoswitch } from "react-icons/si";
import ConsoleGuideModal from "./ConsoleGuideModal";
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
  const [showConsoleModal, setShowConsoleModal] = useState(false);

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
    <>
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

        <div className="hud-info-footer">
          <div className="hud-platforms-icons">
            <FaWindows className="brand-icon windows" title="Windows PC" />
            <FaApple className="brand-icon apple" title="macOS / iOS" />
            <FaAndroid className="brand-icon android" title="Android" />
            <FaPlaystation 
              className="brand-icon playstation console-trigger" 
              title="Haz clic para ver la guía de conexión en consolas" 
              onClick={() => setShowConsoleModal(true)} 
            />
            <FaXbox 
              className="brand-icon xbox console-trigger" 
              title="Haz clic para ver la guía de conexión en consolas" 
              onClick={() => setShowConsoleModal(true)} 
            />
            <SiNintendoswitch 
              className="brand-icon nintendo console-trigger" 
              title="Haz clic para ver la guía de conexión en consolas" 
              onClick={() => setShowConsoleModal(true)} 
            />
          </div>
          
          <div className="hud-divider-small"></div>
          
          <div className="hud-version-badge" title="Versión Soportada">
            <Box size={12} className="version-icon" />
            <span>1.6 A 1.21.11</span>
          </div>
          
          <div className="hud-divider-small"></div>
          
          <div className="hud-account-types" title="Premium y No-Premium">
            <Crown size={14} className="icon-premium" />
            <Skull size={14} className="icon-nopremium" />
            <span className="account-text">PREMIUM & NO-PREMIUM</span>
          </div>
        </div>
      </div>

      {showConsoleModal && <ConsoleGuideModal onClose={() => setShowConsoleModal(false)} />}
    </>
  );
};

export default ServerStatus;