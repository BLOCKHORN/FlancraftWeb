import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../context/UserContext";
import { useAuthModal } from "../../context/AuthModalContext";
import { apiGet, apiPost } from "../../lib/api/client";
import { createChart } from "lightweight-charts";
import toast from "react-hot-toast";
import "../../styles/components/Bolsa/BolsaLayout.scss";

const getTimeAgo = (timestamp) => {
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const playTradeSound = (type, isProfit = true) => {
  try {
    let audioSrc = "";
    if (type === 'BUY') {
      audioSrc = "/tienda/assets/sounds/cash_register.mp3";
    } else {
      if (isProfit) {
        audioSrc = "/tienda/assets/sounds/jackpot.mp3";
      } else {
        audioSrc = "/tienda/assets/sounds/rekt.mp3";
      }
    }
    
    const audio = new Audio(audioSrc);
    audio.volume = 0.6;
    audio.play().catch(e => {});
  } catch (e) {}
};

const renderMessageWithCoins = (msg) => {
  if (!msg) return null;
  const parts = msg.split('⛃');
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 && <img src="/tienda/assets/coin.png" className="inline-icon mc-pixelated" alt="coins" />}
    </React.Fragment>
  ));
};

const FIRE_GIF_SRC = "/tienda/assets/fire.gif";
const FLANITE_SRC = "/tienda/assets/flanite.webp";

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
  const [ledgerFilter, setLedgerFilter] = useState('ALL');
  
  const [topTraders, setTopTraders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState("NETHERITE_INGOT");
  const [timeframe, setTimeframe] = useState("15m");
  const [activeTab, setActiveTab] = useState("POSITIONS");
  
  const [tradeMode, setTradeMode] = useState('BUY');
  const [tradeAmount, setTradeAmount] = useState(1);
  const [isTrading, setIsTrading] = useState(false);
  const [liquidatingAsset, setLiquidatingAsset] = useState(null);
  const [newsFeed, setNewsFeed] = useState([]);
  const [nextUpdateTimer, setNextUpdateTimer] = useState("--:--");
  const [isTimerCritical, setIsTimerCritical] = useState(false);
  const [airdropInfo, setAirdropStatus] = useState({ pot: 0, winner: 'Nadie', lastPayout: null });
  
  const lastTradeTime = useRef(0);
  const chartContainerRef = useRef();
  const chartInstance = useRef(null);
  const candleSeries = useRef(null);
  const volumeSeries = useRef(null);
  const prevContext = useRef({ asset: null, tf: null });

  const stateRef = useRef({ activeTab: "POSITIONS", ledgerPage: 1, ledgerFilter: 'ALL', ledger: [] });

  useEffect(() => {
    stateRef.current = { activeTab, ledgerPage, ledgerFilter, ledger };
  }, [activeTab, ledgerPage, ledgerFilter, ledger]);

  const getFeePercentForAsset = (mineralId) => {
    if (mineralId === 'NETHERITE_INGOT') return 0.01;
    if (mineralId === 'DIAMOND') return 0.02;
    return 0.05; 
  };

  const simulateAMMTrade = (mineralId, amount, type, customPricesArray) => {
    const arrayToUse = customPricesArray || livePrices;
    const asset = arrayToUse.find(p => p.mineral_id === mineralId);
    
    if (!asset || !asset.coin_pool || !asset.share_pool || amount <= 0) {
      return { finalAmount: 0, executionPrice: 0, priceImpact: 0 };
    }

    const coinPool = asset.coin_pool;
    const sharePool = asset.share_pool;
    const feePercent = getFeePercentForAsset(mineralId);
    const k = coinPool * sharePool;
    const oldPrice = coinPool / sharePool;

    if (type === 'BUY') {
      if (amount >= sharePool) return { finalAmount: 0, executionPrice: 0, priceImpact: 0 };
      const newSharePool = sharePool - amount;
      const newCoinPool = k / newSharePool;
      const coinsRequired = newCoinPool - coinPool;
      const finalAmount = coinsRequired * (1 + feePercent);
      const newPrice = newCoinPool / newSharePool;
      const priceImpact = (newPrice - oldPrice) / oldPrice;
      return { finalAmount, executionPrice: coinsRequired / amount, priceImpact };
    } else {
      const newSharePool = sharePool + amount;
      const newCoinPool = k / newSharePool;
      const coinsReturned = coinPool - newCoinPool;
      const finalAmount = Math.floor(coinsReturned * (1 - feePercent));
      const newPrice = newCoinPool / newSharePool;
      const priceImpact = (newPrice - oldPrice) / oldPrice;
      return { finalAmount, executionPrice: coinsReturned / amount, priceImpact };
    }
  };

  const fetchLedger = async (page = 1, filter = 'ALL') => {
    try {
      const res = await apiGet(`/api/bolsa/ledger?page=${page}&limit=15&mineralId=${filter}`);
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
      
      const current = stateRef.current;
      if (current.activeTab === "LEDGER" && current.ledgerPage === 1) {
        fetchLedger(1, current.ledgerFilter);
      }
    } catch (error) {}
  };

  const fetchUserData = async () => {
    if (!user?.uuid) return;
    try {
      const res = await apiGet(`/api/bolsa/portfolio/${user.uuid}`);
      if (Date.now() - lastTradeTime.current > 4000) {
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
      let dbNews = [];
      try {
        const res = await apiGet("/api/bolsa/news");
        if (res && Array.isArray(res)) {
          dbNews = res.map(n => ({
            id: n.id,
            type: n.type,
            mineralId: n.mineral_id,
            message: n.message,
            time: new Date(n.execute_at || n.created_at).getTime()
          }));
        }
      } catch (e) {}

      const ledgerEvents = (stateRef.current.ledger || []).map(tx => {
        const total = tx.total_coins_exchanged;
        let type = 'INFO';
        let message = '';
        
        if (tx.transaction_type === 'BUY' && total >= 150) {
          type = 'PUMP';
          message = `¡${tx.player_name} ha inyectado ${total.toFixed(0)} ⛃ en ${getAssetDisplayName(tx.mineral_id)}!`;
        } else if (tx.transaction_type === 'SELL' && total >= 150) {
          type = 'CRASH';
          message = `¡${tx.player_name} liquidó ${total.toFixed(0)} ⛃ de ${getAssetDisplayName(tx.mineral_id)}!`;
        } else if (tx.shares >= 20) {
          type = 'WHALE';
          message = `Movimiento inusual: ${tx.player_name} movió ${tx.shares} ud de ${getAssetDisplayName(tx.mineral_id)}.`;
        }

        if (type !== 'INFO') {
          return { id: `ev-${tx.id}`, type, mineralId: tx.mineral_id, message, time: new Date(tx.timestamp).getTime() };
        }
        return null;
      }).filter(Boolean);

      const allEvents = [...dbNews, ...ledgerEvents];
      const uniqueEvents = Array.from(new Map(allEvents.map(item => [item.id, item])).values());
      const combined = uniqueEvents.sort((a, b) => b.time - a.time).slice(0, 15);
      
      setNewsFeed(combined);
    } catch (error) {}
  };

  const fetchAirdrop = async () => {
    try {
      const res = await apiGet("/api/bolsa/airdrop-status");
      if (res && res.current_pot !== undefined) {
        setAirdropStatus({ 
          pot: Number(res.current_pot) || 0, 
          winner: res.last_winner_name || 'Nadie', 
          lastPayout: res.last_payout 
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchMarketData();
    fetchUserData();
    fetchChart();
    fetchAirdrop();
    
    const interval = setInterval(() => {
      fetchMarketData();
      fetchUserData();
      fetchChart();
      fetchNews();
      fetchAirdrop();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user, selectedAsset, timeframe]);

  useEffect(() => {
    if (activeTab === "LEDGER") {
      fetchLedger(ledgerPage, ledgerFilter);
    }
  }, [ledgerPage, activeTab, ledgerFilter]);

  useEffect(() => {
    fetchNews();
  }, [ledger]);

  useEffect(() => {
    const timerInterval = setInterval(() => {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(now.getHours() + 1, 0, 0, 0);

      const distance = nextHour.getTime() - now.getTime();
      const m = Math.floor((distance / (1000 * 60)) % 60);
      const s = Math.floor((distance / 1000) % 60);

      setNextUpdateTimer(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      setIsTimerCritical(m === 0);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

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
        borderColor: '#333',
        barSpacing: 15,
        rightOffset: 12,
        fixLeftEdge: false,
      },
      rightPriceScale: {
        borderColor: '#333'
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#555', style: 3, labelBackgroundColor: '#111' },
        horzLine: { color: '#555', style: 3, labelBackgroundColor: '#111' }
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

    chart.subscribeCrosshairMove((param) => {
      const legend = document.getElementById('chart-legend-overlay');
      const lo = document.getElementById('leg-o');
      const lh = document.getElementById('leg-h');
      const ll = document.getElementById('leg-l');
      const lc = document.getElementById('leg-c');

      if (!legend) return;

      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current.clientHeight
      ) {
        legend.style.display = 'none';
      } else {
        const data = param.seriesData.get(candlestickSeries);
        if (data) {
          legend.style.display = 'flex';
          lo.innerText = data.open.toFixed(2);
          lh.innerText = data.high.toFixed(2);
          ll.innerText = data.low.toFixed(2);
          lc.innerText = data.close.toFixed(2);
          lc.style.color = data.close >= data.open ? '#5EE034' : '#FF5555';
        }
      }
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
  }, [selectedAsset]);

  useEffect(() => {
    if (candleSeries.current && volumeSeries.current && chartData.length > 0) {
      candleSeries.current.setData(chartData);
      
      const volumeFormatted = chartData.map(d => ({
        time: d.time,
        value: d.value,
        color: d.close >= d.open ? 'rgba(94, 224, 52, 0.4)' : 'rgba(255, 85, 85, 0.4)'
      }));
      volumeSeries.current.setData(volumeFormatted);

      if (prevContext.current.asset !== selectedAsset || prevContext.current.tf !== timeframe) {
        chartInstance.current.timeScale().scrollToRealTime();
        prevContext.current = { asset: selectedAsset, tf: timeframe };
      }
    }
  }, [chartData, selectedAsset, timeframe]);

  const getOwnedShares = (mineralId) => {
    const asset = portfolio.find(p => p.mineral_id === mineralId);
    return asset ? asset.shares : 0;
  };

  const getAssetDisplayName = (id) => {
    const map = { 
      NETHERITE_INGOT: "Netherite", 
      DIAMOND: "Diamante", 
      COAL: "Carbon",
      RAW_COPPER: "Cobre Bruto"
    };
    return map[id] || id;
  };

  const getAssetIconPath = (id) => {
    const map = { 
      NETHERITE_INGOT: "netherite.webp", 
      DIAMOND: "diamante.png", 
      COAL: "carbon.webp",
      RAW_COPPER: "cobre.png"
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
            
            try {
              const portRes = await apiGet(`/api/bolsa/portfolio/${user.uuid}`);
              if (portRes) {
                setPortfolio(portRes.portfolio || []);
                setLiquidCoins(portRes.liquidCoins || 0);
              }
              await fetchMarketData();
            } catch(e) {}

            if (activeTab === "LEDGER") fetchLedger(1, ledgerFilter);
            
            setIsTrading(false);
            setLiquidatingAsset(null);
            setTradeAmount(1); 
            lastTradeTime.current = Date.now();
            
            playTradeSound(type, true);

            toast.custom((t) => (
              <div className={`mc-toast-success ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
                <div className="mc-advancement-toast-inner">
                  <div className="toast-icon-wrapper">
                    <img src={getAssetIconPath(mineralId)} className="mc-pixelated" alt="mineral" style={{width: '36px', height: '36px'}}/>
                  </div>
                  <div className="toast-texts">
                    <span className="toast-title" style={{ color: type === 'BUY' ? '#5EE034' : '#fbbf24' }}>
                      {type === 'BUY' ? 'ORDEN EJECUTADA' : 'LIQUIDACION EXITOSA'}
                    </span>
                    <span className="toast-sub">
                      {type === 'BUY' ? 'Adquiriste' : 'Vendiste'} {amount}x participaciones de {getAssetDisplayName(mineralId)}.
                    </span>
                  </div>
                </div>
              </div>
            ), { id: toastId, duration: 5000 });
            
          } else if (statusRes.status !== 'PENDING') {
            clearInterval(poll);
            setIsTrading(false);
            setLiquidatingAsset(null);
            playTradeSound(type, false);
            
            let errorMsg = "Operacion rechazada por el Gremio.";
            if (statusRes.status === 'INSUFFICIENT_FUNDS') errorMsg = "Fondos insuficientes en el servidor.";
            if (statusRes.status === 'INSUFFICIENT_SHARES') errorMsg = "Inventario insuficiente.";
            if (statusRes.status === 'MARKET_FROZEN') errorMsg = "Mercado congelado por la corona.";
            if (statusRes.status === 'LIQUIDITY_ERROR') errorMsg = "Liquidez AMM insuficiente.";
            
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
                <span className="toast-title">TIMEOUT</span>
                <span className="toast-sub">Rutas colapsadas. Intenta de nuevo.</span>
              </div>
            ), { id: toastId, duration: 5000 });
          }
        } catch(e) {}
      }, 500);

    } catch (error) {
      setIsTrading(false);
      setLiquidatingAsset(null);
      
      let errorMsg = "Fallo al conectar con Block Street.";
      const errorType = error?.response?.data?.error || error?.message || "";
      
      if (errorType === "MARKET_OFFLINE") {
         errorMsg = "Mercado cerrado temporalmente por reinicio del servidor.";
      }

      toast.custom((t) => (
        <div className={`mc-toast-error ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <span className="toast-title">{errorType === "MARKET_OFFLINE" ? "MERCADO CERRADO" : "ERROR DE ENRUTAMIENTO"}</span>
          <span className="toast-sub">{errorMsg}</span>
        </div>
      ), { id: toastId, duration: 5000 });
    }
  };

  const currentAssetData = livePrices.find(p => p.mineral_id === selectedAsset);
  const currentPrice = currentAssetData?.current_coin_price || 0;
  const currentPct = currentAssetData?.percent_24h !== undefined ? currentAssetData.percent_24h : (currentAssetData?.last_percent || 0);
  const volume24h = currentAssetData?.volume_24h || 0;
  
  const feePercent = getFeePercentForAsset(selectedAsset);
  const safeAmount = Math.min(1000, Math.max(1, parseInt(tradeAmount, 10) || 1));
  
  const tradeSimulation = simulateAMMTrade(selectedAsset, safeAmount, tradeMode);
  
  const canAffordBuy = liquidCoins >= tradeSimulation.finalAmount;
  
  let maxBuyAmount = 0;
  if (currentAssetData && currentAssetData.coin_pool) {
    let testAmt = 1;
    while(simulateAMMTrade(selectedAsset, testAmt, 'BUY').finalAmount <= liquidCoins && testAmt <= 1000) {
       maxBuyAmount = testAmt;
       testAmt++;
    }
  }
  
  const selectedOwnedShares = getOwnedShares(selectedAsset);
  const maxSellAmount = selectedOwnedShares;
  const activeMaxLimit = tradeMode === 'BUY' ? maxBuyAmount : maxSellAmount;

  const portfolioValueReal = portfolio.reduce((acc, item) => {
    return acc + simulateAMMTrade(item.mineral_id, item.shares, 'SELL', livePrices).finalAmount;
  }, 0);
  const totalNetWorth = liquidCoins + portfolioValueReal;
  
  const isUp = currentAssetData ? currentPct >= 0 : true;
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
          <span className="toast-sub">Transacciones permitidas: 1 - 1000 ud.</span>
        </div>
      ));
      return;
    }

    if (tradeMode === 'SELL' && safeAmount > selectedOwnedShares) {
      toast.custom((t) => (
        <div className={`mc-toast-error ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <span className="toast-title">INSUFICIENTE</span>
          <span className="toast-sub">No tienes esos recursos.</span>
        </div>
      ));
      return;
    }

    if (tradeMode === 'BUY' && !canAffordBuy) {
      toast.custom((t) => (
        <div className={`mc-toast-error ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <span className="toast-title">SIN LIQUIDEZ</span>
          <span className="toast-sub">Fondos insuficientes.</span>
        </div>
      ));
      return;
    }

    setIsTrading(true);
    const toastId = toast.custom((t) => (
      <div className={`mc-toast-loading ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
        <span className="toast-title">{tradeMode === 'BUY' ? 'FIRMANDO CONTRATO...' : 'PREPARANDO VENTA...'}</span>
        <span className="toast-sub">Asegurando operacion con el servidor...</span>
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
        <span className="toast-sub">Vendiendo a precio de mercado...</span>
      </div>
    ));
    
    await processOrderWithPolling(mineralId, amount, 'SELL', toastId);
  };

  const handleFilterChange = (filter) => {
    setLedgerFilter(filter);
    setLedgerPage(1);
  };

  const renderActiveTabContent = () => {
    if (!user?.loggedIn && activeTab === "POSITIONS") {
      return (<div className="mc-empty-state">Identifícate para acceder a tus bóvedas.</div>);
    }

    if (activeTab === "POSITIONS") {
      const activePositions = portfolio.filter(p => p.shares > 0);
      if (activePositions.length === 0) {
        return (
          <div className="mc-empty-state">
            <img src="/tienda/assets/minerals/diamante.png" className="empty-icon mc-pixelated" alt="tip" />
            <h3>Bóvedas Vacías</h3>
            <p>Adquiere recursos para generar riqueza.</p>
          </div>
        );
      }
      return (
        <div className="mc-table-responsive">
          <table className="mc-ledger-table mc-portfolio-table">
            <thead>
              <tr>
                <th>ACTIVO</th>
                <th>POSICIÓN</th>
                <th>LIQUIDACIÓN (REAL)</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {activePositions.map((pos) => {
                const live = livePrices.find(l => l.mineral_id === pos.mineral_id)?.current_coin_price || 0;
                const paperValue = live * pos.shares;
                const invested = pos.average_purchase_price * pos.shares;
                
                const realSaleSim = simulateAMMTrade(pos.mineral_id, pos.shares, 'SELL', livePrices);
                const currentValReal = realSaleSim.finalAmount;
                const pnl = currentValReal - invested;
                const pctDiff = invested > 0 ? ((pnl / invested) * 100).toFixed(1) : "0.0";
                
                const isLiquidating = liquidatingAsset === pos.mineral_id;

                return (
                  <tr key={pos.mineral_id} style={isLiquidating ? { opacity: 0.5 } : {}}>
                    <td className="flex-center font-bold cursor-pointer" onClick={() => setSelectedAsset(pos.mineral_id)}>
                      <img src={getAssetIconPath(pos.mineral_id)} className="mineral-icon-small mc-pixelated" alt="icon" />
                      {getAssetDisplayName(pos.mineral_id)}
                    </td>
                    <td>
                      <div style={{ color: '#fff' }}>{pos.shares} ud.</div>
                      <div style={{ fontSize: '0.8rem', color: '#888' }}>Avg: {pos.average_purchase_price?.toFixed(2)} <img src="/tienda/assets/coin.png" className="inline-icon mc-pixelated" alt="coins" /></div>
                    </td>
                    <td className="portfolio-value-col">
                      <div className="total-val">
                        {currentValReal.toFixed(0)} <img src="/tienda/assets/coin.png" className="coin-icon-small mc-pixelated" alt="coins" />
                        <span style={{fontSize: '0.75rem', color: '#666', marginLeft: '6px', fontWeight: 'normal'}}>(Papel: {paperValue.toFixed(0)})</span>
                      </div>
                      <div className={`pnl-val ${pnl >= 0 ? 'text-green' : 'text-red'}`}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} <img src="/tienda/assets/coin.png" className="inline-icon mc-pixelated" alt="coins" /> ({pnl >= 0 ? '+' : ''}{pctDiff}%)
                      </div>
                    </td>
                    <td className="text-right">
                      <button 
                        className={`mc-btn-sell-small ${isLiquidating ? 'processing' : ''}`} 
                        onClick={() => handleLiquidate(pos.mineral_id, pos.shares)}
                        disabled={isTrading || isLiquidating}
                      >
                        {isLiquidating ? 'VENDIENDO...' : 'LIQUIDAR'}
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
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', overflowX: 'auto', paddingBottom: '5px' }}>
            <button style={{ padding: '6px 12px', background: ledgerFilter === 'ALL' ? '#333' : 'transparent', color: ledgerFilter === 'ALL' ? '#fff' : '#888', border: '1px solid #444', cursor: 'pointer', fontFamily: 'MinecraftRegular' }} onClick={() => handleFilterChange('ALL')}>Todos</button>
            <button style={{ padding: '6px 12px', background: ledgerFilter === 'NETHERITE_INGOT' ? '#333' : 'transparent', color: ledgerFilter === 'NETHERITE_INGOT' ? '#fff' : '#888', border: '1px solid #444', cursor: 'pointer', fontFamily: 'MinecraftRegular' }} onClick={() => handleFilterChange('NETHERITE_INGOT')}>Netherite</button>
            <button style={{ padding: '6px 12px', background: ledgerFilter === 'DIAMOND' ? '#333' : 'transparent', color: ledgerFilter === 'DIAMOND' ? '#fff' : '#888', border: '1px solid #444', cursor: 'pointer', fontFamily: 'MinecraftRegular' }} onClick={() => handleFilterChange('DIAMOND')}>Diamante</button>
            <button style={{ padding: '6px 12px', background: ledgerFilter === 'COAL' ? '#333' : 'transparent', color: ledgerFilter === 'COAL' ? '#fff' : '#888', border: '1px solid #444', cursor: 'pointer', fontFamily: 'MinecraftRegular' }} onClick={() => handleFilterChange('COAL')}>Carbón</button>
            <button style={{ padding: '6px 12px', background: ledgerFilter === 'RAW_COPPER' ? '#333' : 'transparent', color: ledgerFilter === 'RAW_COPPER' ? '#fff' : '#888', border: '1px solid #444', cursor: 'pointer', fontFamily: 'MinecraftRegular' }} onClick={() => handleFilterChange('RAW_COPPER')}>Cobre</button>
          </div>
          <table className="mc-ledger-table" style={{ fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={{ color: '#888' }}>FECHA</th>
                <th style={{ color: '#888' }}>TIPO</th>
                <th style={{ color: '#888' }}>TOTAL</th>
                <th style={{ color: '#888' }}>CANTIDAD</th>
                <th style={{ color: '#888' }}>PRECIO/U</th>
                <th style={{ color: '#888', textAlign: 'right' }}>MERCADER</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((tx) => (
                <tr key={tx.id}>
                  <td style={{ color: '#888' }}>{getTimeAgo(tx.timestamp)}</td>
                  <td className={tx.transaction_type === 'BUY' ? 'text-green' : 'text-red'}>
                    {tx.transaction_type === 'BUY' ? 'Buy' : 'Sell'}
                  </td>
                  <td className="font-bold">
                    <span className={tx.transaction_type === 'BUY' ? 'text-green' : 'text-red'}>{tx.total_coins_exchanged.toFixed(2)}</span> <img src="/tienda/assets/coin.png" className="inline-icon mc-pixelated" alt="coins" />
                  </td>
                  <td style={{ color: tx.transaction_type === 'BUY' ? '#5EE034' : '#FF5555' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {tx.shares}
                      <img src={getAssetIconPath(tx.mineral_id)} className="mc-pixelated" alt="asset" style={{ width: '16px', height: '16px' }} title={getAssetDisplayName(tx.mineral_id)} />
                    </div>
                  </td>
                  <td>{tx.price_per_share.toFixed(2)} <img src="/tienda/assets/coin.png" className="inline-icon mc-pixelated" alt="coins" /></td>
                  <td style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    <span style={{ color: '#fbbf24' }}>{tx.player_name}</span>
                    <img src={`https://minotar.net/helm/${tx.player_name.replace(/^\./, '')}/16.png`} className="mc-pixelated" alt="avatar" style={{ width: '16px', height: '16px', borderRadius: '2px' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="mc-pagination">
            <button onClick={() => setLedgerPage(p => Math.max(1, p - 1))} disabled={ledgerPage === 1}>&lt; ANT</button>
            <span>PÁG {ledgerPage} DE {ledgerTotalPages}</span>
            <button onClick={() => setLedgerPage(p => Math.min(ledgerTotalPages, p + 1))} disabled={ledgerPage === ledgerTotalPages}>SIG &gt;</button>
          </div>
        </div>
      );
    }

    return (
      <div className="mc-table-responsive">
        <table className="mc-ledger-table">
          <thead>
            <tr><th>#</th><th>COMERCIANTE</th><th>PNL NETO</th></tr>
          </thead>
          <tbody>
            {topTraders.map((trader, i) => (
              <tr key={i}>
                <td className="font-bold">{i + 1}</td>
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
            const pct = p.percent_24h !== undefined ? p.percent_24h : (p.last_percent || 0);
            const isHot = Math.abs(pct) >= 0.05;
            const priceColor = pct > 0 ? 'text-green' : pct < 0 ? 'text-red' : 'text-gray';
            const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '—';
            
            return (
              <div key={i} className="mc-ticker-item">
                {isHot && <span className="mc-hot-badge">[HOT]</span>}
                <img src={getAssetIconPath(p.mineral_id)} className="mc-pixelated" alt="icon" />
                <span className="name">{getAssetDisplayName(p.mineral_id)}</span>
                <span className={`price ${priceColor}`}>
                  {p.current_coin_price.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon-small mc-pixelated" alt="coins" /> 
                  ({pct > 0 ? '+' : ''}{(pct * 100).toFixed(1)}%) {arrow}
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
              <span className="hud-label">PATRIMONIO TOTAL</span>
              <span className={`hud-value highlight ${isTrading ? 'syncing' : ''}`}>
                {isTrading ? 'SYNC...' : <>{totalNetWorth.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon mc-pixelated" alt="coins" /></>}
              </span>
            </div>
            <div className="hud-item">
              <span className="hud-label">LIQUIDEZ EN JUEGO</span>
              <div className="hud-value-group">
                <span className={`hud-value ${isTrading ? 'syncing' : ''}`}>
                  {isTrading ? 'SYNC...' : <>{liquidCoins.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon mc-pixelated" alt="coins" /></>}
                </span>
                <button className="mc-btn-add" onClick={() => navigate('/tienda')} disabled={isTrading}>+</button>
              </div>
            </div>
            <div className="hud-item desktop-only">
              <span className="hud-label">VALOR BÓVEDA (REAL)</span>
              <span className={`hud-value ${isTrading ? 'syncing' : ''}`}>
                {isTrading ? 'SYNC...' : <>{portfolioValueReal.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon mc-pixelated" alt="coins" /></>}
              </span>
            </div>
          </div>
        )}

        <div className="mc-asset-strip">
          {livePrices.map((asset) => {
            const owned = getOwnedShares(asset.mineral_id);
            const pct = asset.percent_24h !== undefined ? asset.percent_24h : (asset.last_percent || 0);
            const isHot = Math.abs(pct) >= 0.05;
            return (
              <div 
                key={asset.mineral_id} 
                className={`asset-card-horiz ${selectedAsset === asset.mineral_id ? 'active' : ''}`}
                onClick={() => setSelectedAsset(asset.mineral_id)}
              >
                <img src={getAssetIconPath(asset.mineral_id)} className="mc-pixelated main-icon" alt="m" />
                <div className="card-data">
                  <span className="name">{getAssetDisplayName(asset.mineral_id)} {isHot && <span className="mc-hot-badge">!</span>}</span>
                  <div className="price-row">
                     <span className={`price ${pct > 0 ? 'text-green' : pct < 0 ? 'text-red' : 'text-gray'}`}>
                       {asset.current_coin_price.toFixed(2)} <img src="/tienda/assets/coin.png" className="inline-icon mc-pixelated" alt="c" />
                     </span>
                     <span className={`pct ${pct > 0 ? 'bg-green' : pct < 0 ? 'bg-red' : 'bg-gray'}`}>
                       {pct > 0 ? '+' : ''}{(pct * 100).toFixed(1)}%
                     </span>
                  </div>
                  {owned > 0 && <span className="owned-tag">{owned} en bóveda</span>}
                </div>
              </div>
            );
          })}
        </div>

        {selectedAsset === 'NETHERITE_INGOT' && user?.loggedIn && getOwnedShares('NETHERITE_INGOT') > 0 && (
          <div className="mc-burn-banner">
            <div className="burn-info">
              <img src={FIRE_GIF_SRC} className="fire-gif-icon mc-pixelated" alt="fire" />
              <div>
                <strong>TIENES {getOwnedShares('NETHERITE_INGOT')} NETHERITES</strong>
                <p>Puedes forjarlos en la Forja para obtener Flanites <img src={FLANITE_SRC} className="inline-icon mc-pixelated" alt="flanite" /> instantáneos.</p>
              </div>
            </div>
            <button className="mc-btn-burn" onClick={() => navigate('/forja')}>IR A LA FORJA</button>
          </div>
        )}
        
        {selectedAsset === 'DIAMOND' && (
          <div className="mc-diamond-info">
             <div className="diamond-header">
               <img src={getAssetIconPath('DIAMOND')} className="mc-pixelated" alt="d"/>
               <span>DIVIDENDOS DE LA CORONA</span>
             </div>
             <div className="diamond-body">
               <p>Retener Diamantes te otorga <strong>Poder de Influencia</strong> para reclamar el Tributo del Gremio cada hora.</p>
               <p>Si la influencia general no supera a la banca, el Gremio retiene los fondos y <strong>el bote se acumula</strong>.</p>
               {user?.loggedIn && (
                 <p className="diamond-status">
                   Tu Nivel de Influencia actual: <strong>{getOwnedShares('DIAMOND')}</strong>
                 </p>
               )}
             </div>
          </div>
        )}

        <div className="mc-cex-terminal">
          {!user?.loggedIn && (
            <div className="mc-overlay-lock">
              <div className="lock-box">
                <h3>ACCESO RESTRINGIDO</h3>
                <p>Identifícate ante el Gremio para comerciar.</p>
                <button className="mc-btn-solid mc-btn-gold" onClick={openAuthModal}>INICIAR SESIÓN</button>
              </div>
            </div>
          )}

          <div className="terminal-header">
            <div className="asset-title">
              <img src={getAssetIconPath(selectedAsset)} className="mineral-icon-large mc-pixelated" alt="a" />
              <div className="title-texts">
                <div className="title-header-row">
                  <h2>{getAssetDisplayName(selectedAsset)}</h2>
                  <span className="vol-24h">Vol 24h: <span className="text-green">{volume24h.toFixed(0)}</span> <img src="/tienda/assets/coin.png" className="inline-icon mc-pixelated" alt="c" /></span>
                </div>
                <span className={`terminal-current-price ${glowClass}`}>
                  {currentPrice.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon-small mc-pixelated" alt="coins" />
                  <span className={`price-percent ${currentPct > 0 ? 'text-green' : currentPct < 0 ? 'text-red' : 'text-gray'}`}>
                    ({currentPct > 0 ? '+' : ''}{(currentPct * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>

            <div className="header-controls">
              <div className="mc-timeframe-tabs">
                {['15m', '1H', '4H', '1D'].map((tf) => (
                  <button key={tf} className={timeframe === tf ? 'active' : ''} onClick={() => setTimeframe(tf)}>{tf}</button>
                ))}
              </div>
              <div className="airdrop-mini">
                <span className="label">TRIBUTO (⏱ {nextUpdateTimer})</span>
                <span className="pot">{airdropInfo.pot ? airdropInfo.pot.toFixed(0) : '0'} <img src="/tienda/assets/coin.png" className="coin-icon-small mc-pixelated" alt="coins" /></span>
              </div>
            </div>
          </div>

          <div className="terminal-body-grid">
            <div className="mc-chart-area">
              <div id="chart-legend-overlay" className="chart-legend">
                <span className="legend-title">{getAssetDisplayName(selectedAsset)}</span>
                <div><span>O</span> <span id="leg-o">0.00</span></div>
                <div><span>H</span> <span id="leg-h">0.00</span></div>
                <div><span>L</span> <span id="leg-l">0.00</span></div>
                <div><span>C</span> <span id="leg-c">0.00</span></div>
              </div>
              
              <div ref={chartContainerRef} className="chart-container" />
              {chartData.length === 0 && (
                <div className="chart-empty">ENVIANDO EXPLORADORES...</div>
              )}
            </div>

            <div className="mc-trade-area">
              <div className="mc-trade-mode-toggle">
                <button className={tradeMode === 'BUY' ? 'active buy' : ''} onClick={() => setTradeMode('BUY')}>COMPRAR</button>
                <button className={tradeMode === 'SELL' ? 'active sell' : ''} onClick={() => setTradeMode('SELL')}>VENDER</button>
              </div>
              
              <div className="trade-inner">
                <div className="trade-balances">
                  <span>Disponible:</span>
                  <strong>
                    {tradeMode === 'BUY' ? (
                      <>{liquidCoins.toFixed(2)} <img src="/tienda/assets/coin.png" className="coin-icon-small mc-pixelated" alt="c" /></>
                    ) : (
                      selectedOwnedShares + ' ud.'
                    )}
                  </strong>
                </div>

                <div className="input-wrapper">
                  <span className="prefix">Cant.</span>
                  <input 
                    type="number" 
                    value={tradeAmount} 
                    onChange={(e) => setTradeAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    onBlur={() => setTradeAmount(prev => Math.min(1000, Math.max(1, Number(prev))))}
                    disabled={isTrading}
                  />
                  <span className="suffix">UD</span>
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
                    <span>Precio / ud.</span>
                    <span>{currentPrice.toFixed(2)} <img src="/tienda/assets/coin.png" className="inline-icon mc-pixelated" alt="c" /></span>
                  </div>
                  <div className="summary-row">
                    <span>Slippage</span>
                    <span className={Math.abs(tradeSimulation.priceImpact) > 0.05 ? 'text-red' : 'text-gray'}>
                       {tradeMode === 'SELL' && tradeSimulation.priceImpact < 0 ? '' : (tradeMode === 'BUY' && tradeSimulation.priceImpact > 0 ? '+' : '')}{(tradeSimulation.priceImpact * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Tasa ({(feePercent * 100).toFixed(0)}%)</span>
                    <span className="text-gray">{(tradeSimulation.finalAmount / (1 + (tradeMode === 'BUY' ? feePercent : -feePercent)) * feePercent).toFixed(2)} <img src="/tienda/assets/coin.png" className="inline-icon mc-pixelated" alt="c" /></span>
                  </div>
                  <div className="summary-row total">
                    <span>{tradeMode === 'BUY' ? 'Coste Total' : 'Recibes'}</span>
                    <span className={tradeMode === 'BUY' ? 'text-red' : 'text-green'}>
                      {tradeMode === 'BUY' ? tradeSimulation.finalAmount.toFixed(2) : tradeSimulation.finalAmount.toFixed(0)} <img src="/tienda/assets/coin.png" className="inline-icon mc-pixelated" alt="c" />
                    </span>
                  </div>
                </div>

                {tradeMode === 'BUY' ? (
                   <button className="mc-btn-solid mc-btn-green-block full-width" onClick={handleAction} disabled={isTrading || !user?.loggedIn || !canAffordBuy}>
                     <span className="title">{canAffordBuy ? `COMPRAR` : 'SIN FONDOS'}</span>
                   </button>
                ) : (
                   <button className="mc-btn-solid mc-btn-red-block full-width" onClick={handleAction} disabled={isTrading || !user?.loggedIn || selectedOwnedShares < safeAmount}>
                     <span className="title">{selectedOwnedShares >= safeAmount ? `VENDER` : 'SIN STOCK'}</span>
                   </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mc-bottom-grid">
          
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

          <div className="mc-gui-window mc-news-panel">
            <div className="mc-news-header">REGISTRO DE ACTIVIDAD</div>
            <div className="mc-news-content">
              {newsFeed.length === 0 ? (
                <div className="mc-news-empty">Las calles están tranquilas. No hay actividad documentada...</div>
              ) : (
                newsFeed.map(news => (
                  <div key={news.id} className="mc-news-item">
                    <span className={`news-tag ${news.type}`}>
                      {news.type === 'WHALE' ? '[BALLENA]' : news.type === 'PUMP' ? '[PUMP]' : news.type === 'CRASH' ? '[DUMP]' : '[INFO]'}
                    </span>
                    <span className="news-text">
                      {renderMessageWithCoins(news.message)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default BolsaLayout;