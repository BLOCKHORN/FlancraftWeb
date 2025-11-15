// src/components/ServerStatus.jsx
import React, { useState, useEffect } from 'react'
import { Copy } from 'lucide-react'
import '../../styles/components/Landpage/_serverstatus.scss'

const ServerStatus = () => {
  const [copied, setCopied] = useState(false)
  const [serverStatus, setServerStatus] = useState('offline')
  const [playersOnline, setPlayersOnline] = useState(0)

  const copyIP = () => {
    navigator.clipboard.writeText('play.flancraft.com')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fetchServerStatus = async () => {
    try {
      const res = await fetch('https://api.mcsrvstat.us/2/play.flancraft.com')
      const data = await res.json()
      setServerStatus(data.online ? 'online' : 'offline')
      setPlayersOnline(data.players?.online || 0)
    } catch {

      setServerStatus('offline')
      setPlayersOnline(0)
    }
  }

  useEffect(() => {
    fetchServerStatus()
    const interval = setInterval(fetchServerStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`server-status-bar ${serverStatus}`}>
      <span className="ip-info">
        <strong>IP:</strong> play.flancraft.com
        <button onClick={copyIP} title="Copiar IP">
          <Copy size={16} />
        </button>
      </span>
      <span className="status-indicator">
  {serverStatus === 'online'
    ? `${playersOnline} jugadores conectados`
    : 'Servidor offline'}
</span>
      {copied && <span className="copied-text">IP copiada!</span>}
    </div>
  )
}

export default ServerStatus
