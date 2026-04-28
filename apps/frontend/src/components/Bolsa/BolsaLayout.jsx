import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { useAuthModal } from "../../context/AuthModalContext";
import { apiGet, apiPost } from "../../lib/api/client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Brush } from "recharts";
import toast from "react-hot-toast";
import "../../styles/components/Bolsa/BolsaLayout.scss";

const playTradeSound = (type, isProfit = true) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'BUY') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
    } else {
      if (isProfit) {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);
      } else {
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
      }
    }
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start(); 
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="mc-chart-tooltip">
        <p className="mc-tooltip-time">{label}</p>
        <p className="mc-tooltip-price">
          {payload[0].value.toFixed(2)}
          <img src="/tienda/assets/coin.png" className="coin-icon mc-pixelated" alt="coins" />
        </p>
      </div>
    );
  }
  return null;
};

const BolsaLayout = () => {
  const { user } = useContext(UserContext);
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  
  const [livePrices, setLivePrices] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [liquidCoins, setLiquidCoins] = useState(0);
  
  const [ledger, setLedger] = useState([]);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  
  const [topTraders, setTopTraders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState("DIAMOND");
  const [timeframe, setTimeframe] = useState("24H");
  const [activeTab, setActiveTab] = useState("POSITIONS");
  
  const [tradeAmount, setTradeAmount] = useState(1);
  const [isTrading, setIsTrading] = useState(false);
  const [liquidatingAsset, setLiquidatingAsset] = useState(null);
  const [newsFeed, setNewsFeed] = useState([]);
  const [nextUpdateTimer, setNextUpdateTimer] = useState("--:--");
  const [isTimerCritical, setIsTimerCritical] = useState(false);
  
  const lastTradeTime = useRef(0);

  const fetchLedger = async (page = 1) => {
    try {
      const res = await apiGet(`/api/bolsa/ledger?page=${page}&limit=12`);
      if (res && res.transactions) {
        setLedger(res.transactions);
        setLedgerTotalPages(res.totalPages);
        setLedgerPage(res.page);
      }
    } catch (error) {}
  };

  const fetchMarketData = async () => {
    try {
      const [pricesRes, topRes] = await Promise.all([
        apiGet("/api/bolsa/live"),
        apiGet("/api/bolsa/top-traders").catch(() => [])
      ]);
      setLivePrices(pricesRes || []);
      setTopTraders(topRes || []);
      if (activeTab === "LEDGER" && ledgerPage === 1) {
        fetchLedger(1);
      }
    } catch (error) {}
  };

  const fetchUserData = async () => {
    if (!user?.uuid) return;
    try {
      const res = await apiGet(`/api/bolsa/portfolio/${user.uuid}`);
      if (Date.now() - lastTradeTime.current > 8000) {
        setPortfolio(res.portfolio || []);
        setLiquidCoins(res.liquidCoins || 0);
      }
    } catch (error) {}
  };

  const fetchChart = async () => {
    try {
      const chartRes = await apiGet(`/api/bolsa/chart/${selectedAsset}?tf=${timeframe}`);
      setChartData(chartRes.map(item => ({
        time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        price: item.price_per_share
      })));
    } catch (error) {}
  };

  useEffect(() => {
    fetchMarketData();
    fetchUserData();
    fetchChart();
    if (activeTab === "LEDGER" && ledger.length === 0) {
      fetchLedger(ledgerPage);
    }
    const interval = setInterval(() => {
      fetchMarketData();
      fetchUserData();
    }, 5000);
    return () => clearInterval(interval);
  }, [user, selectedAsset, timeframe]);

  useEffect(() => {
    if (activeTab === "LEDGER") {
      fetchLedger(ledgerPage);
    }
  }, [ledgerPage, activeTab]);

  useEffect(() => {
    if (livePrices.length === 0 || !livePrices[0].last_updated) return;

    const timerInterval = setInterval(() => {
      let safeDateStr = livePrices[0].last_updated;
      if (safeDateStr.includes(" ") && !safeDateStr.includes("T")) {
        safeDateStr = safeDateStr.replace(" ", "T");
      }
      
      const lastUpdateDate = new Date(safeDateStr).getTime();
      
      if (isNaN(lastUpdateDate)) {
        setNextUpdateTimer("--:--");
        return;
      }

      const nextUpdateDate = lastUpdateDate + (15 * 60 * 1000);
      const now = Date.now();
      const distance = nextUpdateDate - now;

      if (distance <= 0) {
        setNextUpdateTimer("00:00");
        setIsTimerCritical(true);
      } else {
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setNextUpdateTimer(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        setIsTimerCritical(m === 0);
      }
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [livePrices]);

  useEffect(() => {
    if (livePrices.length === 0) return;
    const generatedNews = [];
    
    livePrices.forEach(p => {
      const percent = p.last_percent * 100;
      if (percent >= 3.5) {
        generatedNews.push({ id: `pump-${p.mineral_id}`, type: 'UP', mineralId: p.mineral_id, percent: percent.toFixed(1) });
      } else if (percent <= -3.5) {
        generatedNews.push({ id: `dump-${p.mineral_id}`, type: 'DOWN', mineralId: p.mineral_id, percent: percent.toFixed(1) });
      } else if (percent >= 1.5) {
        generatedNews.push({ id: `rumor-${p.mineral_id}`, type: 'INFO', mineralId: p.mineral_id });
      }
    });

    const whales = ledger.filter(tx => tx.shares >= 32).slice(0, 3);
    whales.forEach(w => {
      const action = w.transaction_type === 'BUY' ? 'comprado' : 'dumpeado';
      generatedNews.push({ id: `whale-${w.id}`, type: 'WHALE', mineralId: w.mineral_id, playerName: w.player_name, action, amount: w.shares });
    });

    setNewsFeed(prev => {
      const allNews = [...generatedNews, ...prev].slice(0, 8);
      return Array.from(new Map(allNews.map(item => [item.id, item])).values());
    });
  }, [livePrices, ledger]);

  const getOwnedShares = (mineralId) => {
    const asset = portfolio.find(p => p.mineral_id === mineralId);
    return asset ? asset.shares : 0;
  };

  const getAssetDisplayName = (id) => {
    const map = { 
      DIAMOND: "Diamante", GOLD_INGOT: "Oro", IRON_INGOT: "Hierro", 
      EMERALD: "Esmeralda", NETHERITE_INGOT: "Netherite", COAL: "Carbon",
      RAW_COPPER: "Cobre Bruto", CHORUS_FRUIT: "Fruta del End", FLINT: "Pedernal", QUARTZ: "Cuarzo"
    };
    return map[id] || id;
  };

  const getAssetIconPath = (id) => {
    const map = { 
      DIAMOND: "diamante.png", GOLD_INGOT: "oro.png", IRON_INGOT: "plata.png",
      EMERALD: "esmeralda.webp", NETHERITE_INGOT: "netherite.webp", COAL: "carbon.webp",
      RAW_COPPER: "cobre.png", CHORUS_FRUIT: "frunta.webp", FLINT: "Pedernal.png", QUARTZ: "cuarzo.webp"
    };
    return `/tienda/assets/minerals/${map[id] || id + '.png'}`;
  };

  const processOrderWithPolling = async (mineralId, amount, type, toastId) => {
    try {
      const actualName = user.nombre_minecraft || user.username || user.nombre || "Inversor";
      const orderRes = await apiPost("/api/bolsa/trade", {
        uuid: user.uuid,
        playerName: actualName,
        mineralId: mineralId,
        type: type,
        amount: amount
      });

      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await apiGet(`/api/bolsa/order-status/${orderRes.id}`);
          
          if (statusRes.status === 'COMPLETED') {
            clearInterval(poll);
            playTradeSound(type, true);
            lastTradeTime.current = Date.now();
            
            setTimeout(async () => {
              await fetchUserData();
              await fetchMarketData();
              if (activeTab === "LEDGER") fetchLedger(1);
              setIsTrading(false);
              setLiquidatingAsset(null);
              
              toast.custom((t) => (
                <div className={`mc-toast-success ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
                  <div className="mc-advancement-toast-inner">
                    <div className="toast-icon-wrapper">
                      <img src={getAssetIconPath(mineralId)} className="mc-pixelated" alt="mineral" style={{width: '36px', height: '36px'}}/>
                    </div>
                    <div className="toast-texts">
                      <span className="toast-title" style={{ color: type === 'BUY' ? '#5EE034' : '#fbbf24' }}>
                        {type === 'BUY' ? 'ORDEN DE COMPRA EJECUTADA' : 'LIQUIDACION COMPLETADA'}
                      </span>
                      <span className="toast-sub">
                        {type === 'BUY' ? 'Has adquirido' : 'Has vendido'} {amount}x participaciones de {getAssetDisplayName(mineralId)}.
                      </span>
                    </div>
                  </div>
                </div>
              ), { id: toastId, duration: 5000 });
            }, 800);
            
          } else if (statusRes.status !== 'PENDING') {
            clearInterval(poll);
            setIsTrading(false);
            setLiquidatingAsset(null);
            
            let errorMsg = "Operación rechazada.";
            if (statusRes.status === 'INSUFFICIENT_FUNDS') errorMsg = "Fondos in-game insuficientes para procesar la orden.";
            if (statusRes.status === 'INSUFFICIENT_SHARES') errorMsg = "No posees la cantidad requerida en tu portafolio.";
            if (statusRes.status === 'MARKET_FROZEN') errorMsg = "El mercado de valores ha sido congelado por la administración.";
            
            toast.custom((t) => (
              <div className={`mc-toast-error ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
                <span className="toast-title">TRANSACCION RECHAZADA</span>
                <span className="toast-sub">{errorMsg}</span>
              </div>
            ), { id: toastId, duration: 5000 });
          }
          
          if (attempts > 40) {
            clearInterval(poll);
            setIsTrading(false);
            setLiquidatingAsset(null);
            toast.custom((t) => (
              <div className={`mc-toast-error ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
                <span className="toast-title">TIEMPO DE ESPERA AGOTADO</span>
                <span className="toast-sub">El servidor de Minecraft no está respondiendo a la API.</span>
              </div>
            ), { id: toastId, duration: 5000 });
          }
        } catch(e) {}
      }, 500);

    } catch (error) {
      setIsTrading(false);
      setLiquidatingAsset(null);
      toast.custom((t) => (
        <div className={`mc-toast-error ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <span className="toast-title">ERROR DE ENRUTAMIENTO</span>
          <span className="toast-sub">Block Street no ha podido enlazar tu orden. Intenta nuevamente.</span>
        </div>
      ), { id: toastId, duration: 5000 });
    }
  };

  const handleTrade = async (type) => {
    if (!user?.loggedIn) { openAuthModal(); return; }
    if (isTrading) return;

    const mineralId = selectedAsset;
    const amount = parseInt(tradeAmount, 10);
    
    if (isNaN(amount) || amount <= 0 || amount > 1000) {
      toast.custom((t) => (
        <div className={`mc-toast-error ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <span className="toast-title">VOLUMEN INVALIDO</span>
          <span className="toast-sub">El marco regulatorio exige transacciones entre 1 y 1000 unidades.</span>
        </div>
      ));
      return;
    }

    setIsTrading(true);
    const toastId = toast.custom((t) => (
      <div className={`mc-toast-loading ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
        <span className="toast-title">SINCRONIZANDO BLOCKCHAIN...</span>
        <span className="toast-sub">Verificando fondos en vivo dentro del servidor. Espere...</span>
      </div>
    ));
    
    await processOrderWithPolling(mineralId, amount, type, toastId);
  };

  const handleLiquidate = async (mineralId, amount) => {
    if (!user?.loggedIn || isTrading || amount <= 0) return;
    setIsTrading(true);
    setLiquidatingAsset(mineralId);

    const toastId = toast.custom((t) => (
      <div className={`mc-toast-loading ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
        <span className="toast-title">EJECUTANDO ORDEN DE VENTA...</span>
        <span className="toast-sub">Contactando con los agentes del mercado. Espere...</span>
      </div>
    ));
    
    await processOrderWithPolling(mineralId, amount, 'SELL', toastId);
  };

  const currentAssetData = livePrices.find(p => p.mineral_id === selectedAsset);
  const currentPrice = currentAssetData?.current_coin_price || 0;
  const safeAmount = Math.min(1000, Math.max(1, parseInt(tradeAmount, 10) || 1));
  
  const feePercent = 0.02;
  const slippageRate = 0.00005;

  const buySlippageFactor = 1.0 + (safeAmount * slippageRate);
  const finalBuyPrice = currentPrice * buySlippageFactor;
  const avgBuyPrice = (currentPrice + finalBuyPrice) / 2.0;
  const totalBuyCostRaw = safeAmount * avgBuyPrice;
  const estBuyCost = totalBuyCostRaw + (totalBuyCostRaw * feePercent);

  const sellSlippageFactor = 1.0 - (safeAmount * slippageRate);
  const finalSellPrice = currentPrice * Math.max(0.1, sellSlippageFactor);
  const avgSellPrice = (currentPrice + finalSellPrice) / 2.0;
  const totalSellValueRaw = safeAmount * avgSellPrice;
  const estSellValue = totalSellValueRaw - (totalSellValueRaw * feePercent);

  const portfolioValue = portfolio.reduce((acc, item) => acc + (item.shares * (livePrices.find(p => p.mineral_id === item.mineral_id)?.current_coin_price || 0)), 0);
  const totalNetWorth = liquidCoins + portfolioValue;
  
  const isUp = currentAssetData ? currentAssetData.trend_arrow !== "DOWN" : true;
  const chartColor = isUp ? "#5EE034" : "#FF5555";
  const glowClass = isUp ? "glow-green" : "glow-red";

  const selectedOwnedShares = getOwnedShares(selectedAsset);
  const canAffordBuy = liquidCoins >= estBuyCost;

  const renderActiveTabContent = () => {
    if (!user?.loggedIn && activeTab === "POSITIONS") {
      return (<div className="mc-empty-state">Inicia sesion para visualizar tu inventario de acciones.</div>);
    }

    if (activeTab === "POSITIONS") {
      const activePositions = portfolio.filter(p => p.shares > 0);
      if (activePositions.length === 0) {
        return (
          <div className="mc-empty-state">
            <img src="/tienda/assets/minerals/diamante.png" className="empty-icon mc-pixelated" alt="tip" />
            <h3>Tu portafolio está en blanco</h3>
            <p>Ejecuta órdenes de compra en el terminal superior para construir tu patrimonio.</p>
          </div>
        );
      }
      return (
        <div className="mc-table-responsive">
          <table className="mc-ledger-table">
            <thead>
              <tr>
                <th>ACTIVO</th>
                <th>ACCIONES</th>
                <th className="flex-center">ROI</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {activePositions.map((pos) => {
                const live = livePrices.find(l => l.mineral_id === pos.mineral_id)?.current_coin_price || 0;
                const pnl = (live - (pos.average_purchase_price || live)) * pos.shares;
                const isLiquidating = liquidatingAsset === pos.mineral_id;

                return (
                  <tr key={pos.mineral_id}>
                    <td className="flex-center font-bold cursor-pointer" onClick={() => setSelectedAsset(pos.mineral_id)}>
                      <img src={getAssetIconPath(pos.mineral_id)} className="mineral-icon-small mc-pixelated" alt="icon" />
                      {getAssetDisplayName(pos.mineral_id)}
                    </td>
                    <td>{pos.shares}</td>
                    <td className={`flex-center ${pnl >= 0 ? 'text-green' : 'text-red'}`}>
                      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon mc-pixelated" alt="coins" />
                    </td>
                    <td className="text-right">
                      <button 
                        className={`mc-btn-sell-small ${isLiquidating ? 'processing' : ''}`} 
                        onClick={() => handleLiquidate(pos.mineral_id, pos.shares)}
                        disabled={isTrading || isLiquidating}
                      >
                        {isLiquidating ? 'Procesando...' : 'Liquidar Activo'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (activeTab === "LEDGER") {
      return (
        <div className="mc-table-responsive flex-column-between">
          <table className="mc-ledger-table">
            <thead>
              <tr><th>INVERSOR</th><th>TIPO</th><th>MERCADO</th><th>VOL</th><th>PRECIO/U</th><th>LIQUIDEZ MOVILIZADA</th></tr>
            </thead>
            <tbody>
              {ledger.map((tx) => (
                <tr key={tx.id}>
                  <td className="font-bold">{tx.player_name}</td>
                  <td className={tx.transaction_type === 'BUY' ? 'text-green' : 'text-red'}>
                    {tx.transaction_type === 'BUY' ? 'COMPRA' : 'VENTA'}
                  </td>
                  <td className="flex-center">
                    <img src={getAssetIconPath(tx.mineral_id)} className="mineral-icon-small mc-pixelated" alt="icon" />
                    {getAssetDisplayName(tx.mineral_id)}
                  </td>
                  <td>{tx.shares}</td>
                  <td>{tx.price_per_share.toFixed(2)}</td>
                  <td className="flex-center font-bold">
                    {tx.total_coins_exchanged.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon mc-pixelated" alt="coins" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="mc-pagination">
            <button 
              onClick={() => setLedgerPage(p => Math.max(1, p - 1))} 
              disabled={ledgerPage === 1}
            >
              &#171; ANTERIOR
            </button>
            <span>PÁGINA {ledgerPage} DE {ledgerTotalPages}</span>
            <button 
              onClick={() => setLedgerPage(p => Math.min(ledgerTotalPages, p + 1))} 
              disabled={ledgerPage === ledgerTotalPages}
            >
              SIGUIENTE &#187;
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="mc-table-responsive">
        <table className="mc-ledger-table">
          <thead>
            <tr><th>RANGO</th><th>INVERSOR INSTITUCIONAL</th><th>BENEFICIO NETO REALIZADO</th></tr>
          </thead>
          <tbody>
            {topTraders.map((trader, i) => (
              <tr key={i}>
                <td className="font-bold">#{i + 1}</td>
                <td className="font-bold">{trader.name}</td>
                <td className={`flex-center font-bold ${trader.profit > 0 ? 'text-green' : 'text-red'}`}>
                  {trader.profit > 0 ? '+' : ''}{trader.profit.toFixed(2)} 
                  <img src="/tienda/assets/coin.png" className="coin-icon mc-pixelated" alt="coins" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="mc-bolsa-wrapper">
      <div className="mc-ticker-wrap">
        <div className="mc-ticker">
          {[...livePrices, ...livePrices].map((p, i) => {
            const isHot = Math.abs(p.last_percent) >= 0.05;
            const priceColor = p.last_percent > 0 ? 'text-green' : p.last_percent < 0 ? 'text-red' : 'text-gray';
            const arrow = p.last_percent > 0 ? '▲' : p.last_percent < 0 ? '▼' : '—';
            
            return (
              <div key={i} className="mc-ticker-item">
                {isHot && <span className="mc-hot-badge">[HOT]</span>}
                <img src={getAssetIconPath(p.mineral_id)} className="mc-pixelated" alt="icon" />
                <span className="name">{getAssetDisplayName(p.mineral_id)}</span>
                <span className={`price ${priceColor}`}>
                  {p.current_coin_price.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon-small mc-pixelated" alt="coins" /> 
                  ({p.last_percent > 0 ? '+' : ''}{(p.last_percent * 100).toFixed(1)}%) {arrow}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mc-bolsa-layout">
        <div className="mc-bolsa-grid">
          
          <div className="mc-main-panel">
            {user?.loggedIn && (
              <div className="mc-gui-window mc-wallet-hud">
                <div className="hud-item">
                  <span className="hud-label">RIQUEZA TOTAL ESTIMADA</span>
                  <span className="hud-value highlight">
                    {totalNetWorth.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon mc-pixelated" alt="coins" />
                  </span>
                </div>
                <div className="hud-item">
                  <span className="hud-label">LIQUIDEZ DISPONIBLE (IN-GAME)</span>
                  <div className="hud-value-group">
                    <span className="hud-value">
                      {liquidCoins.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon mc-pixelated" alt="coins" />
                    </span>
                    <button className="mc-btn-add" onClick={() => navigate('/tienda')} title="Comprar Coins">+</button>
                  </div>
                </div>
                <div className="hud-item">
                  <span className="hud-label">VALOR DEL PORTAFOLIO EN VIVO</span>
                  <span className="hud-value">
                    {portfolioValue.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon mc-pixelated" alt="coins" />
                  </span>
                </div>
              </div>
            )}

            <div className="mc-gui-window mc-trading-terminal">
              {!user?.loggedIn && (
                <div className="mc-overlay-lock">
                  <div className="lock-box">
                    <h3>ACCESO DENEGADO</h3>
                    <p>Requiere identificacion de jugador para operar en Block Street.</p>
                    <button className="mc-btn-solid mc-btn-gold" onClick={openAuthModal}>INICIAR SESIÓN</button>
                  </div>
                </div>
              )}
              
              <div className="mc-gui-header-inner">
                <div className="asset-title-area">
                  <div className="mc-item-slot">
                    <img src={getAssetIconPath(selectedAsset)} className="mineral-icon-large mc-pixelated" alt="a" />
                  </div>
                  <div className="title-texts">
                    <h2>{getAssetDisplayName(selectedAsset)}</h2>
                    <span className={`terminal-current-price ${glowClass}`}>
                      {currentAssetData?.current_coin_price.toFixed(2) || "0.00"} <img src="/tienda/assets/coin.png" className="coin-icon-small mc-pixelated" alt="coins" />
                      {currentAssetData && (
                        <span className={`price-percent ${currentAssetData.last_percent > 0 ? 'text-green' : currentAssetData.last_percent < 0 ? 'text-red' : 'text-gray'}`}>
                          ({currentAssetData.last_percent > 0 ? '+' : ''}{(currentAssetData.last_percent * 100).toFixed(1)}%)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="mc-terminal-right-header">
                  <div className={`mc-market-clock ${isTimerCritical ? 'critical' : ''}`}>
                    <span className="clock-label">PRÓXIMO CIERRE DE VELA:</span>
                    <span className="clock-time">{nextUpdateTimer}</span>
                  </div>
                  <div className="mc-timeframe-tabs">
                    {["1H", "24H", "7D", "ALL"].map(tf => (
                      <button key={tf} className={timeframe === tf ? "active" : ""} onClick={() => setTimeframe(tf)}>
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mc-chart-screen">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        stroke="#555" 
                        tick={{ fill: '#888', fontSize: 10, fontFamily: 'MinecraftBold' }} 
                        tickLine={false}
                        axisLine={{ stroke: '#333', strokeWidth: 2 }}
                        minTickGap={30}
                      />
                      <YAxis 
                        domain={['auto', 'auto']} 
                        stroke="#555" 
                        tick={{ fill: '#888', fontSize: 10, fontFamily: 'MinecraftBold' }} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => val.toFixed(0)} 
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#555', strokeWidth: 2, strokeDasharray: '4 4' }} />
                      <Area type="stepAfter" dataKey="price" stroke={chartColor} fill="url(#mcGrid)" fillOpacity={1} strokeWidth={3} isAnimationActive={false}/>
                      <defs>
                        <pattern id="mcGrid" width="4" height="4" patternUnits="userSpaceOnUse">
                          <rect width="4" height="4" fill={chartColor} opacity="0.15" />
                          <rect width="2" height="2" fill={chartColor} opacity="0.3" />
                        </pattern>
                      </defs>
                      <Brush 
                        dataKey="time" 
                        height={24} 
                        stroke="#4f4f4f" 
                        fill="#1a1a1a" 
                        travellerWidth={12}
                        tickFormatter={() => ""}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">CARGANDO CHUNKS...</div>
                )}
              </div>

              <div className="mc-action-bar">
                <div className="mc-trading-info">
                  <span className="label">EN PROPIEDAD</span>
                  <span className="value">{selectedOwnedShares}</span>
                </div>
                
                <div className="mc-trading-controls">
                  <div className="mc-quantity-selector">
                    <button onClick={() => setTradeAmount(prev => Math.max(1, prev - 1))} disabled={isTrading}>-</button>
                    <input 
                      type="number" 
                      value={tradeAmount} 
                      onChange={(e) => setTradeAmount(e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={() => setTradeAmount(prev => Math.min(1000, Math.max(1, Number(prev))))}
                      disabled={isTrading}
                    />
                    <button onClick={() => setTradeAmount(prev => Math.min(1000, Number(prev) + 1))} disabled={isTrading}>+</button>
                    <button className="btn-stack" onClick={() => setTradeAmount(64)} disabled={isTrading}>x64</button>
                  </div>

                  <div className="mc-trading-buttons">
                    {!canAffordBuy && user?.loggedIn ? (
                      <button className="mc-btn-solid mc-btn-gold-block" onClick={() => navigate('/tienda')}>
                        <span className="title">SIN LIQUIDEZ</span>
                        <span className="subtitle">COMPRAR COINS &gt;</span>
                      </button>
                    ) : (
                      <button className="mc-btn-solid mc-btn-green-block" onClick={() => handleTrade('BUY')} disabled={isTrading || !user?.loggedIn}>
                        <span className="title">COMPRAR {safeAmount}</span>
                        <span className="subtitle">Coste final: ~{estBuyCost.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon-small mc-pixelated" alt="c" /></span>
                      </button>
                    )}
                    <button className="mc-btn-solid mc-btn-red-block" onClick={() => handleTrade('SELL')} disabled={isTrading || !user?.loggedIn || selectedOwnedShares < safeAmount}>
                      <span className="title">VENDER {safeAmount}</span>
                      <span className="subtitle">Retorno: ~{estSellValue.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon-small mc-pixelated" alt="c" /></span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mc-ledger-wrapper">
              <div className="mc-ledger-tabs-row">
                <button className={`mc-tab ${activeTab === "POSITIONS" ? "active" : ""}`} onClick={() => setActiveTab("POSITIONS")}>Mi Portafolio</button>
                <button className={`mc-tab ${activeTab === "LEDGER" ? "active" : ""}`} onClick={() => setActiveTab("LEDGER")}>Libro de Órdenes</button>
                <button className={`mc-tab ${activeTab === "TOP" ? "active" : ""}`} onClick={() => setActiveTab("TOP")}>Ranking Institucional</button>
              </div>
              <div className="mc-gui-window mc-ledger-body">
                <div className="mc-ledger-content">
                  {renderActiveTabContent()}
                </div>
              </div>
            </div>

          </div>

          <div className="mc-side-column">
            
            <div className="mc-gui-window mc-news-panel">
              <div className="mc-news-header">BLOCK STREET JOURNAL</div>
              <div className="mc-news-content">
                {newsFeed.length === 0 ? (
                  <div className="mc-news-empty">Buscando rumores en las tabernas de MC-500...</div>
                ) : (
                  newsFeed.map(news => (
                    <div key={news.id} className="mc-news-item">
                      <span className={`news-tag ${news.type}`}>{news.type === 'WHALE' ? '[BALLENA]' : news.type === 'UP' ? '[PUMP]' : news.type === 'DOWN' ? '[CRASH]' : '[RUMOR]'}</span>
                      <span className="news-text">
                        {news.type === 'UP' && <>¡ESCASEZ EXTREMA! <img src={getAssetIconPath(news.mineralId)} className="inline-icon mc-pixelated" alt="i"/> {getAssetDisplayName(news.mineralId)} estalla un +{news.percent}%</>}
                        {news.type === 'DOWN' && <>¡PÁNICO DE VENTAS! <img src={getAssetIconPath(news.mineralId)} className="inline-icon mc-pixelated" alt="i"/> {getAssetDisplayName(news.mineralId)} se hunde un {news.percent}%</>}
                        {news.type === 'INFO' && <>RUMOR: Movimientos institucionales impulsan <img src={getAssetIconPath(news.mineralId)} className="inline-icon mc-pixelated" alt="i"/> {getAssetDisplayName(news.mineralId)}.</>}
                        {news.type === 'WHALE' && <>BALLENA INSTITUCIONAL: {news.playerName} ha {news.action} {news.amount}x <img src={getAssetIconPath(news.mineralId)} className="inline-icon mc-pixelated" alt="i"/> {getAssetDisplayName(news.mineralId)}.</>}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mc-gui-window mc-side-panel">
              <div className="mc-side-header">ÍNDICE DE COTIZACIONES</div>
              <div className="mc-assets-list">
                {livePrices.map((asset) => {
                  const owned = getOwnedShares(asset.mineral_id);
                  const isHot = Math.abs(asset.last_percent) >= 0.05;
                  
                  return (
                    <div key={asset.mineral_id} className={`mc-asset-row ${selectedAsset === asset.mineral_id ? 'active' : ''}`} onClick={() => setSelectedAsset(asset.mineral_id)}>
                      <div className="asset-left">
                        <img src={getAssetIconPath(asset.mineral_id)} className="mc-pixelated" alt="m" />
                        <div className="asset-names">
                          <h4>
                            {getAssetDisplayName(asset.mineral_id)}
                            {isHot && <span className="mc-hot-badge">[HOT]</span>}
                          </h4>
                          <span className="asset-owned">{owned > 0 ? `${owned} en cartera` : ''}</span>
                        </div>
                      </div>
                      <div className="asset-right">
                        <span className={`asset-price ${asset.last_percent > 0 ? 'text-green' : asset.last_percent < 0 ? 'text-red' : 'text-gray'}`}>
                          {asset.current_coin_price.toFixed(2)}
                          <img src="/tienda/assets/coin.png" className="coin-icon-small mc-pixelated" alt="c" />
                        </span>
                        <span className={`asset-percent ${asset.last_percent > 0 ? 'bg-green' : asset.last_percent < 0 ? 'bg-red' : 'bg-gray'}`}>
                          {asset.last_percent > 0 ? '+' : ''}{(asset.last_percent * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default BolsaLayout;