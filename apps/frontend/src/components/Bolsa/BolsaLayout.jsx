import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { useAuthModal } from "../../context/AuthModalContext";
import { apiGet, apiPost } from "../../lib/api/client";
import { createChart } from "lightweight-charts";
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
  
  const [tradeMode, setTradeMode] = useState('BUY');
  const [tradeAmount, setTradeAmount] = useState(1);
  const [isTrading, setIsTrading] = useState(false);
  const [liquidatingAsset, setLiquidatingAsset] = useState(null);
  const [newsFeed, setNewsFeed] = useState([]);
  const [nextUpdateTimer, setNextUpdateTimer] = useState("--:--");
  const [isTimerCritical, setIsTimerCritical] = useState(false);
  
  const lastTradeTime = useRef(0);
  const chartContainerRef = useRef();
  const chartInstance = useRef(null);
  const candleSeries = useRef(null);
  const volumeSeries = useRef(null);

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
      const res = await apiGet(`/api/bolsa/chart/${selectedAsset}?tf=${timeframe}`);
      if (res && Array.isArray(res)) {
        setChartData(res);
      }
    } catch (error) {}
  };

  const fetchNews = async () => {
    try {
      const serverNews = await apiGet("/api/bolsa/news");
      const formattedServerNews = (serverNews || []).map(n => ({
        id: n.id,
        type: n.type,
        mineralId: n.mineral_id,
        message: n.message,
        time: new Date(n.created_at).getTime()
      }));

      const whales = ledger.filter(tx => tx.shares >= 32).map(w => ({
        id: `whale-${w.id}`,
        type: 'WHALE',
        mineralId: w.mineral_id,
        playerName: w.player_name,
        action: w.transaction_type === 'BUY' ? 'comprado' : 'liquidado',
        amount: w.shares,
        time: new Date(w.timestamp).getTime()
      }));

      const combined = [...formattedServerNews, ...whales].sort((a, b) => b.time - a.time).slice(0, 8);
      setNewsFeed(combined);
    } catch (error) {}
  };

  useEffect(() => {
    fetchMarketData();
    fetchUserData();
    fetchChart();
    
    const interval = setInterval(() => {
      fetchMarketData();
      fetchUserData();
      fetchChart();
      fetchNews();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user, selectedAsset, timeframe]);

  useEffect(() => {
    if (activeTab === "LEDGER") {
      fetchLedger(ledgerPage);
    }
  }, [ledgerPage, activeTab]);

  useEffect(() => {
    fetchNews();
  }, [ledger]);

  // RELOJ ABSOLUTO Y MATEMÁTICO (Sincronizado con Java)
  useEffect(() => {
    const timerInterval = setInterval(() => {
      const now = new Date();
      const next = new Date(now);
      
      next.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
      next.setSeconds(0);
      next.setMilliseconds(0);

      if (now.getMinutes() % 15 === 0 && now.getSeconds() === 0) {
        next.setMinutes(next.getMinutes() + 15);
      }

      const distance = next.getTime() - now.getTime();
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

      setNextUpdateTimer(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      setIsTimerCritical(m === 0);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  // INICIALIZACIÓN DEL GRÁFICO (Con purga de React 18)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    chartContainerRef.current.innerHTML = '';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#888',
        fontFamily: 'MinecraftRegular, sans-serif'
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#333'
      },
      rightPriceScale: {
        borderColor: '#333'
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#555', style: 3 },
        horzLine: { color: '#555', style: 3 }
      }
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#5EE034',
      downColor: '#FF5555',
      borderVisible: false,
      wickUpColor: '#5EE034',
      wickDownColor: '#FF5555'
    });

    const histogramSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    histogramSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartInstance.current = chart;
    candleSeries.current = candlestickSeries;
    volumeSeries.current = histogramSeries;

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (candleSeries.current && volumeSeries.current && chartData.length > 0) {
      candleSeries.current.setData(chartData);
      
      const volumeFormatted = chartData.map(d => ({
        time: d.time,
        value: d.value,
        color: d.close >= d.open ? 'rgba(94, 224, 52, 0.4)' : 'rgba(255, 85, 85, 0.4)'
      }));
      volumeSeries.current.setData(volumeFormatted);
    }
  }, [chartData]);

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
              setTradeAmount(1); 
              
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
            
            let errorMsg = "Operacion rechazada por el Gremio.";
            if (statusRes.status === 'INSUFFICIENT_FUNDS') errorMsg = "Fondos in-game insuficientes para procesar la orden.";
            if (statusRes.status === 'INSUFFICIENT_SHARES') errorMsg = "No posees la cantidad requerida en tu inventario.";
            if (statusRes.status === 'MARKET_FROZEN') errorMsg = "El mercado de valores ha sido congelado por la corona.";
            
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
                <span className="toast-sub">Las rutas comerciales están colapsadas. Intenta de nuevo.</span>
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

  const currentAssetData = livePrices.find(p => p.mineral_id === selectedAsset);
  const currentPrice = currentAssetData?.current_coin_price || 0;
  
  const feePercent = 0.02;
  const slippageRate = 0.002;

  const selectedOwnedShares = getOwnedShares(selectedAsset);
  const safeAmount = Math.min(1000, Math.max(1, parseInt(tradeAmount, 10) || 1));
  
  const buySlippageFactor = 1.0 + (safeAmount * slippageRate);
  const finalBuyPrice = currentPrice * buySlippageFactor;
  const avgBuyPrice = (currentPrice + finalBuyPrice) / 2.0;
  const totalBuyCostRaw = safeAmount * avgBuyPrice;
  const feeValueBuy = totalBuyCostRaw * feePercent;
  const estBuyCost = totalBuyCostRaw + feeValueBuy;

  const sellSlippageFactor = 1.0 - (safeAmount * slippageRate);
  const finalSellPrice = currentPrice * Math.max(0.1, sellSlippageFactor);
  const avgSellPrice = (currentPrice + finalSellPrice) / 2.0;
  const totalSellValueRaw = safeAmount * avgSellPrice;
  const feeValueSell = totalSellValueRaw * feePercent;
  const estSellValue = totalSellValueRaw - feeValueSell;

  const canAffordBuy = liquidCoins >= estBuyCost;
  const rawCostPerUnit = currentPrice * (1 + slippageRate) * (1 + feePercent);
  const maxBuyAmount = Math.max(0, Math.floor(liquidCoins / rawCostPerUnit));
  const maxSellAmount = selectedOwnedShares;
  const activeMaxLimit = tradeMode === 'BUY' ? maxBuyAmount : maxSellAmount;

  const portfolioValue = portfolio.reduce((acc, item) => acc + (item.shares * (livePrices.find(p => p.mineral_id === item.mineral_id)?.current_coin_price || 0)), 0);
  const totalNetWorth = liquidCoins + portfolioValue;
  
  const isUp = currentAssetData ? currentAssetData.trend_arrow !== "DOWN" : true;
  const chartColor = isUp ? "#5EE034" : "#FF5555";
  const glowClass = isUp ? "glow-green" : "glow-red";

  const handlePercentageSelect = (pct) => {
    let calculated = Math.floor(activeMaxLimit * (pct / 100));
    if (calculated < 1 && activeMaxLimit > 0) calculated = 1;
    setTradeAmount(Math.min(1000, calculated));
  };

  const handleAction = async () => {
    if (!user?.loggedIn) { openAuthModal(); return; }
    if (isTrading) return;

    if (isNaN(safeAmount) || safeAmount <= 0 || safeAmount > 1000) {
      toast.custom((t) => (
        <div className={`mc-toast-error ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <span className="toast-title">VOLUMEN INVALIDO</span>
          <span className="toast-sub">El Gremio permite transacciones entre 1 y 1000 unidades.</span>
        </div>
      ));
      return;
    }

    if (tradeMode === 'SELL' && safeAmount > selectedOwnedShares) {
      toast.custom((t) => (
        <div className={`mc-toast-error ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <span className="toast-title">INSUFICIENTE</span>
          <span className="toast-sub">No posees suficientes recursos en tu cartera.</span>
        </div>
      ));
      return;
    }

    if (tradeMode === 'BUY' && !canAffordBuy) {
      toast.custom((t) => (
        <div className={`mc-toast-error ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <span className="toast-title">SIN LIQUIDEZ</span>
          <span className="toast-sub">Fondos insuficientes en el servidor de juego.</span>
        </div>
      ));
      return;
    }

    setIsTrading(true);
    const toastId = toast.custom((t) => (
      <div className={`mc-toast-loading ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
        <span className="toast-title">{tradeMode === 'BUY' ? 'FIRMANDO CONTRATO COMERCIAL...' : 'PREPARANDO CARAVANAS DE VENTA...'}</span>
        <span className="toast-sub">Asegurando la operacion con el servidor. Espere...</span>
      </div>
    ));
    
    await processOrderWithPolling(selectedAsset, safeAmount, tradeMode, toastId);
  };

  const handleLiquidate = async (mineralId, amount) => {
    if (!user?.loggedIn || isTrading || amount <= 0) return;
    setIsTrading(true);
    setLiquidatingAsset(mineralId);

    const toastId = toast.custom((t) => (
      <div className={`mc-toast-loading ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
        <span className="toast-title">LIQUIDANDO ACTIVOS...</span>
        <span className="toast-sub">Vendiendo participaciones a los mercaderes. Espere...</span>
      </div>
    ));
    
    await processOrderWithPolling(mineralId, amount, 'SELL', toastId);
  };

  const renderActiveTabContent = () => {
    if (!user?.loggedIn && activeTab === "POSITIONS") {
      return (<div className="mc-empty-state">Identificate en el sistema para acceder a tus bóvedas.</div>);
    }

    if (activeTab === "POSITIONS") {
      const activePositions = portfolio.filter(p => p.shares > 0);
      if (activePositions.length === 0) {
        return (
          <div className="mc-empty-state">
            <img src="/tienda/assets/minerals/diamante.png" className="empty-icon mc-pixelated" alt="tip" />
            <h3>Tus bóvedas están vacías</h3>
            <p>Adquiere recursos en el mercado para empezar a generar riqueza.</p>
          </div>
        );
      }
      return (
        <div className="mc-table-responsive">
          <table className="mc-ledger-table">
            <thead>
              <tr>
                <th>ACTIVO</th>
                <th>CANTIDAD</th>
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
                        {isLiquidating ? 'Vendiendo...' : 'Vender Todo'}
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
              <tr><th>COMERCIANTE</th><th>TIPO</th><th>RECURSO</th><th>UD</th><th>PRECIO/U</th><th>LIQUIDEZ MOVIDA</th></tr>
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
            <tr><th>RANGO</th><th>COMERCIANTE EXPERTO</th><th>BENEFICIO NETO REALIZADO</th></tr>
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
                {isHot && <span className="mc-hot-badge">[ALERTA]</span>}
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
        
        {user?.loggedIn && (
          <div className="mc-gui-window mc-wallet-hud">
            <div className="hud-item">
              <span className="hud-label">PATRIMONIO TOTAL ESTIMADO</span>
              <span className="hud-value highlight">
                {totalNetWorth.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon mc-pixelated" alt="coins" />
              </span>
            </div>
            <div className="hud-item">
              <span className="hud-label">LIQUIDEZ EN BÓVEDA (JUEGO)</span>
              <div className="hud-value-group">
                <span className="hud-value">
                  {liquidCoins.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon mc-pixelated" alt="coins" />
                </span>
                <button className="mc-btn-add" onClick={() => navigate('/tienda')} title="Conseguir Coins">+</button>
              </div>
            </div>
            <div className="hud-item desktop-only">
              <span className="hud-label">VALOR DE RECURSOS EN VENTA</span>
              <span className="hud-value">
                {portfolioValue.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon mc-pixelated" alt="coins" />
              </span>
            </div>
          </div>
        )}

        <div className="mc-mobile-asset-strip">
          {livePrices.map((asset) => {
            const isHot = Math.abs(asset.last_percent) >= 0.05;
            return (
              <div 
                key={asset.mineral_id} 
                className={`mobile-asset-card ${selectedAsset === asset.mineral_id ? 'active' : ''}`}
                onClick={() => setSelectedAsset(asset.mineral_id)}
              >
                <img src={getAssetIconPath(asset.mineral_id)} className="mc-pixelated" alt="m" />
                <div className="mobile-asset-data">
                  <span className="name">{getAssetDisplayName(asset.mineral_id)} {isHot && <span className="mc-hot-badge">!</span>}</span>
                  <span className={`price ${asset.last_percent > 0 ? 'text-green' : asset.last_percent < 0 ? 'text-red' : 'text-gray'}`}>
                    {asset.current_coin_price.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mc-bolsa-grid">
          <div className="mc-main-panel">

            <div className="mc-gui-window mc-trading-terminal">
              {!user?.loggedIn && (
                <div className="mc-overlay-lock">
                  <div className="lock-box">
                    <h3>ACCESO RESTRINGIDO</h3>
                    <p>Identifícate ante el Gremio para comerciar en Block Street.</p>
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
                    <span className="clock-label">PRÓXIMO REAJUSTE COMERCIAL:</span>
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
                <div ref={chartContainerRef} style={{ width: '100%', height: '350px' }} />
                {chartData.length === 0 && (
                  <div className="chart-empty" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems:'center', justifyContent: 'center', pointerEvents: 'none'}}>
                    ENVIANDO EXPLORADORES...
                  </div>
                )}
              </div>

              <div className="mc-cex-trading-panel">
                <div className="mc-trade-mode-toggle">
                  <button className={tradeMode === 'BUY' ? 'active buy' : ''} onClick={() => setTradeMode('BUY')}>COMPRAR</button>
                  <button className={tradeMode === 'SELL' ? 'active sell' : ''} onClick={() => setTradeMode('SELL')}>VENDER</button>
                </div>
                
                <div className="mc-trade-body">
                  <div className="trade-balances">
                    <span className="bal-item">Disponible: <strong>{tradeMode === 'BUY' ? liquidCoins.toFixed(2) + ' ⛃' : selectedOwnedShares + ' ud.'}</strong></span>
                  </div>

                  <div className="trade-input-group">
                    <div className="input-wrapper">
                      <span className="prefix">Cantidad</span>
                      <input 
                        type="number" 
                        value={tradeAmount} 
                        onChange={(e) => setTradeAmount(e.target.value.replace(/[^0-9]/g, ''))}
                        onBlur={() => setTradeAmount(prev => Math.min(1000, Math.max(1, Number(prev))))}
                        disabled={isTrading}
                      />
                      <span className="suffix">UD</span>
                    </div>
                  </div>

                  <div className="trade-slider-group">
                    <input 
                      type="range" 
                      className={`mc-range-slider ${tradeMode === 'BUY' ? 'buy' : 'sell'}`}
                      min="1" 
                      max={activeMaxLimit > 0 ? Math.min(1000, activeMaxLimit) : 1} 
                      value={safeAmount} 
                      onChange={(e) => setTradeAmount(e.target.value)}
                      disabled={isTrading || activeMaxLimit === 0}
                    />
                    <div className="pct-buttons">
                      <button onClick={() => handlePercentageSelect(25)} disabled={isTrading}>25%</button>
                      <button onClick={() => handlePercentageSelect(50)} disabled={isTrading}>50%</button>
                      <button onClick={() => handlePercentageSelect(75)} disabled={isTrading}>75%</button>
                      <button onClick={() => handlePercentageSelect(100)} disabled={isTrading}>MAX</button>
                    </div>
                  </div>

                  <div className="trade-summary">
                    <div className="summary-row">
                      <span>Precio Base / ud.</span>
                      <span>{currentPrice.toFixed(2)} ⛃</span>
                    </div>
                    <div className="summary-row">
                      <span title="Impacto de escasez por gran volumen">Impacto de Mercado</span>
                      <span className="text-gray">{tradeMode === 'BUY' ? '+' : '-'}{Math.abs(currentPrice - avgBuyPrice).toFixed(2)} ⛃</span>
                    </div>
                    <div className="summary-row">
                      <span title="Tasa de la Corona (2%)">Impuesto Comercial</span>
                      <span className="text-gray">{tradeMode === 'BUY' ? feeValueBuy.toFixed(2) : feeValueSell.toFixed(2)} ⛃</span>
                    </div>
                    <div className="summary-row total">
                      <span>{tradeMode === 'BUY' ? 'Coste Total' : 'Recibes'}</span>
                      <span className={tradeMode === 'BUY' ? 'text-red' : 'text-green'}>
                        {tradeMode === 'BUY' ? estBuyCost.toFixed(2) : estSellValue.toFixed(2)} ⛃
                      </span>
                    </div>
                  </div>

                  {tradeMode === 'BUY' ? (
                     <button className="mc-btn-solid mc-btn-green-block full-width" onClick={handleAction} disabled={isTrading || !user?.loggedIn || !canAffordBuy}>
                       <span className="title">{canAffordBuy ? `COMPRAR ${getAssetDisplayName(selectedAsset)}` : 'RECURSOS INSUFICIENTES'}</span>
                     </button>
                  ) : (
                     <button className="mc-btn-solid mc-btn-red-block full-width" onClick={handleAction} disabled={isTrading || !user?.loggedIn || selectedOwnedShares < safeAmount}>
                       <span className="title">{selectedOwnedShares >= safeAmount ? `VENDER ${getAssetDisplayName(selectedAsset)}` : 'INVENTARIO VACÍO'}</span>
                     </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mc-ledger-wrapper">
              <div className="mc-ledger-tabs-row">
                <button className={`mc-tab ${activeTab === "POSITIONS" ? "active" : ""}`} onClick={() => setActiveTab("POSITIONS")}>Mis Bóvedas</button>
                <button className={`mc-tab ${activeTab === "LEDGER" ? "active" : ""}`} onClick={() => setActiveTab("LEDGER")}>Libro Mayor</button>
                <button className={`mc-tab ${activeTab === "TOP" ? "active" : ""}`} onClick={() => setActiveTab("TOP")}>Mercaderes Top</button>
              </div>
              <div className="mc-gui-window mc-ledger-body">
                <div className="mc-ledger-content">
                  {renderActiveTabContent()}
                </div>
              </div>
            </div>

          </div>

          <div className="mc-side-column">
            
            <div className="mc-gui-window mc-side-panel">
              <div className="mc-side-header">TASAS COMERCIALES</div>
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
                            {isHot && <span className="mc-hot-badge">[ALERTA]</span>}
                          </h4>
                          <span className="asset-owned">{owned > 0 ? `${owned} en bóveda` : ''}</span>
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

            <div className="mc-gui-window mc-news-panel">
              <div className="mc-news-header">RUMORES Y EVENTOS</div>
              <div className="mc-news-content">
                {newsFeed.length === 0 ? (
                  <div className="mc-news-empty">Las calles están tranquilas. No hay rumores comerciales...</div>
                ) : (
                  newsFeed.map(news => (
                    <div key={news.id} className="mc-news-item">
                      <span className={`news-tag ${news.type}`}>{news.type === 'WHALE' ? '[BALLENA]' : news.type === 'PUMP' ? '[ALERTA]' : news.type === 'CRASH' ? '[PELIGRO]' : '[RUMOR]'}</span>
                      <span className="news-text">
                        {news.type === 'PUMP' && <><img src={getAssetIconPath(news.mineralId)} className="inline-icon mc-pixelated" alt="i"/> {news.message}</>}
                        {news.type === 'CRASH' && <><img src={getAssetIconPath(news.mineralId)} className="inline-icon mc-pixelated" alt="i"/> {news.message}</>}
                        {news.type === 'WHALE' && <>Un noble ({news.playerName}) ha {news.action} {news.amount}x <img src={getAssetIconPath(news.mineralId)} className="inline-icon mc-pixelated" alt="i"/> {getAssetDisplayName(news.mineralId)}.</>}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default BolsaLayout;