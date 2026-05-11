const supabase = require("../models/db");

exports.getLivePrices = async (req, res) => {
  try {
    const { data: liveData, error: liveError } = await supabase
      .from("market_live_prices")
      .select("*")
      .order("current_coin_price", { ascending: false });

    if (liveError) throw liveError;

    const timeLimit24h = new Date();
    timeLimit24h.setHours(timeLimit24h.getHours() - 24);

    const [ohlcRes, poolsRes] = await Promise.all([
      supabase.from("market_ohlc_data").select("mineral_id, open_price, volume").gte("timestamp", timeLimit24h.toISOString()).order("timestamp", { ascending: true }),
      supabase.from("market_amm_pools").select("mineral_id, coin_pool, share_pool")
    ]);

    if (ohlcRes.error) throw ohlcRes.error;
    if (poolsRes.error) throw poolsRes.error;

    const ohlcData = ohlcRes.data || [];
    const poolsData = poolsRes.data || [];

    const enrichedData = liveData.map(asset => {
      const assetOhlc = ohlcData.filter(d => d.mineral_id === asset.mineral_id);
      const pool = poolsData.find(p => p.mineral_id === asset.mineral_id) || { coin_pool: 0, share_pool: 0 };
      
      let volume24h = 0;
      let percent24h = asset.last_percent;

      if (assetOhlc.length > 0) {
        volume24h = assetOhlc.reduce((sum, d) => sum + (d.volume * d.open_price), 0);
        
        const price24hAgo = assetOhlc[0].open_price;
        if (price24hAgo > 0) {
            percent24h = (asset.current_coin_price - price24hAgo) / price24hAgo;
        }
      }

      return {
        ...asset,
        volume_24h: volume24h,
        percent_24h: percent24h,
        coin_pool: pool.coin_pool,
        share_pool: pool.share_pool
      };
    });

    res.status(200).json(enrichedData);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo precios de mercado." });
  }
};

exports.getOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("web_pending_orders")
      .select("status")
      .eq("id", id)
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Error consultando estado." });
  }
};

exports.getPortfolio = async (req, res) => {
  try {
    let { uuid } = req.params;
    if (!uuid) return res.status(400).json({ error: "UUID requerido." });
    
    uuid = uuid.trim().toLowerCase(); 

    const [portfolioRes, liquidRes] = await Promise.all([
      supabase.from("market_portfolios").select("*").eq("uuid", uuid),
      supabase.from("monedas_actuales").select("coins").eq("uuid", uuid).eq("servidor", "survival").limit(1)
    ]);

    if (portfolioRes.error) throw portfolioRes.error;
    if (liquidRes.error) throw liquidRes.error;

    const liquidCoins = liquidRes.data.length > 0 ? liquidRes.data[0].coins : 0;

    res.status(200).json({
      portfolio: portfolioRes.data,
      liquidCoins: liquidCoins
    });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo cartera del jugador." });
  }
};

exports.getLedger = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const mineralId = req.query.mineralId;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabase
      .from("market_transactions_ledger")
      .select("*", { count: "exact" })
      .order("timestamp", { ascending: false })
      .range(start, end);

    if (mineralId && mineralId !== 'ALL') {
      query = query.eq("mineral_id", mineralId);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const uuids = [...new Set(data.map(tx => tx.uuid))];
    const userMap = {};

    if (uuids.length > 0) {
      const { data: usersData } = await supabase
        .from("usuarios")
        .select("uuid, rango_usuario, rango_staff")
        .in("uuid", uuids);

      if (usersData) {
        usersData.forEach(u => {
          userMap[u.uuid] = u.rango_usuario || u.rango_staff || null;
        });
      }
    }

    const enrichedData = data.map(tx => ({
      ...tx,
      rango: userMap[tx.uuid] || null
    }));
    
    res.status(200).json({
      transactions: enrichedData,
      total: count,
      page: page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo transacciones." });
  }
};

exports.getChartData = async (req, res) => {
  try {
    const { mineral } = req.params;
    const tf = req.query.tf || '15m';
    
    if (!mineral) return res.status(400).json({ error: "Mineral requerido." });

    const tfConfig = {
      '15m': { hoursBack: 48, groupMs: 15 * 60 * 1000 },
      '1H':  { hoursBack: 24 * 14, groupMs: 60 * 60 * 1000 },
      '4H':  { hoursBack: 24 * 60, groupMs: 4 * 60 * 60 * 1000 },
      '1D':  { hoursBack: 24 * 365, groupMs: 24 * 60 * 60 * 1000 }
    };

    const config = tfConfig[tf] || tfConfig['15m'];

    let timeLimit = new Date();
    timeLimit.setHours(timeLimit.getHours() - config.hoursBack);

    const { data, error } = await supabase
      .from("market_ohlc_data")
      .select("open_price, high_price, low_price, close_price, volume, timestamp")
      .eq("mineral_id", mineral.toUpperCase())
      .gte("timestamp", timeLimit.toISOString())
      .order("timestamp", { ascending: false })
      .limit(5000); 

    if (error) throw error;

    const groupedData = new Map();

    data.forEach(candle => {
      const candleTime = new Date(candle.timestamp).getTime();
      if (isNaN(candleTime)) return;

      const groupTime = Math.floor(candleTime / config.groupMs) * config.groupMs;

      if (!groupedData.has(groupTime)) {
        groupedData.set(groupTime, {
          time: groupTime / 1000, 
          open: candle.open_price,
          high: candle.high_price,
          low: candle.low_price,
          close: candle.close_price,
          value: candle.volume
        });
      } else {
        const existing = groupedData.get(groupTime);
        existing.high = Math.max(existing.high, candle.high_price);
        existing.low = Math.min(existing.low, candle.low_price);
        existing.open = candle.open_price;
        existing.value += candle.volume;
      }
    });

    const formattedData = Array.from(groupedData.values()).sort((a, b) => a.time - b.time);

    res.status(200).json(formattedData);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo datos OHLC." });
  }
};

exports.getTopTraders = async (req, res) => {
  try {
    const { data: pricesData, error: pricesError } = await supabase
      .from('market_live_prices')
      .select('mineral_id, current_coin_price');
      
    if (pricesError) throw pricesError;
    
    const prices = {};
    (pricesData || []).forEach(p => prices[p.mineral_id] = p.current_coin_price);

    const { data: ledgerData, error: ledgerError } = await supabase
      .from('market_transactions_ledger')
      .select('uuid, player_name, transaction_type, total_coins_exchanged');
      
    if (ledgerError) throw ledgerError;

    const traders = {};

    (ledgerData || []).forEach(tx => {
        if (!traders[tx.uuid]) {
            traders[tx.uuid] = { name: tx.player_name, cashflow: 0, paperValue: 0 };
        }
        if (tx.transaction_type === 'BUY') {
            traders[tx.uuid].cashflow -= tx.total_coins_exchanged;
        } else if (tx.transaction_type === 'SELL') {
            traders[tx.uuid].cashflow += tx.total_coins_exchanged;
        }
    });

    const { data: portfoliosData, error: portfoliosError } = await supabase
      .from('market_portfolios')
      .select('uuid, mineral_id, shares');

    if (portfoliosError) throw portfoliosError;

    (portfoliosData || []).forEach(pos => {
       if (traders[pos.uuid] && pos.shares > 0) {
           const currentPrice = prices[pos.mineral_id] || 0;
           traders[pos.uuid].paperValue += (pos.shares * currentPrice);
       }
    });

    const sorted = Object.entries(traders).map(([uuid, t]) => {
        return {
            uuid,
            name: t.name,
            profit: t.cashflow + t.paperValue
        };
    })
    .filter(t => t.profit !== 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

    const uuids = sorted.map(t => t.uuid);
    const userMap = {};

    if (uuids.length > 0) {
      const { data: usersData } = await supabase
        .from("usuarios")
        .select("uuid, rango_usuario, rango_staff")
        .in("uuid", uuids);

      if (usersData) {
        usersData.forEach(u => {
          userMap[u.uuid] = u.rango_usuario || u.rango_staff || null;
        });
      }
    }

    const topWithRank = sorted.map(t => ({
      ...t,
      rango: userMap[t.uuid] || null
    }));

    res.status(200).json(topWithRank);
  } catch (error) {
    res.status(500).json({ error: "Error calculando Top Traders." });
  }
};

exports.createOrder = async (req, res) => {
  try {
    let { uuid, playerName, mineralId, type, amount } = req.body;

    if (!uuid || !playerName || !mineralId || !type || !amount) {
      return res.status(400).json({ error: "Faltan parámetros en la orden o sesión inválida." });
    }

    const { data: stateData, error: stateError } = await supabase
      .from("market_state")
      .select("is_active")
      .eq("id", 1)
      .single();

    if (stateError || !stateData || !stateData.is_active) {
      return res.status(403).json({ error: "MARKET_OFFLINE" }); 
    }

    uuid = uuid.trim().toLowerCase();

    if (type !== "BUY" && type !== "SELL" && type !== "BURN") {
      return res.status(400).json({ error: "Tipo de transacción inválido." });
    }

    if (amount <= 0 || amount > 1000) {
      return res.status(400).json({ error: "La cantidad debe ser entre 1 y 1000." });
    }

    const { data, error } = await supabase
      .from("web_pending_orders")
      .insert([
        {
          uuid_jugador: uuid,
          player_name: playerName,
          mineral_id: mineralId.toUpperCase().trim(),
          transaction_type: type,
          amount: amount,
          status: "PENDING",
        },
      ])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: "Error al inyectar la orden en la cola." });
  }
};

exports.getMarketAnalytics = async (req, res) => {
  try {
    const MINERALES_BOLSA = [
        "NETHERITE_INGOT", "DIAMOND", "COAL", "RAW_COPPER"
    ];
    
    const { data: logData, error: logError } = await supabase
      .from('mc500_aggregated_log')
      .select('mineral_id, total_volume, total_dollars')
      .not('mineral_id', 'in', `(${MINERALES_BOLSA.join(',')})`);

    if (logError) throw logError;

    const aggregation = {};
    logData.forEach(tx => {
      if (!aggregation[tx.mineral_id]) {
        aggregation[tx.mineral_id] = { id: tx.mineral_id, vol: 0, cash: 0 };
      }
      aggregation[tx.mineral_id].vol += tx.total_volume;
      aggregation[tx.mineral_id].cash += tx.total_dollars;
    });

    const topCandidates = Object.values(aggregation)
      .filter(item => item.cash > 2000)
      .sort((a, b) => b.cash - a.cash)
      .slice(0, 8);

    const { data: tradersData, error: tradersError } = await supabase
      .from('market_transactions_ledger')
      .select('uuid, player_name, transaction_type, total_coins_exchanged')
      .order('timestamp', { ascending: false })
      .limit(300); 

    if (tradersError) throw tradersError;

    const tradersMap = {};
    tradersData.forEach(tx => {
      if (!tradersMap[tx.uuid]) tradersMap[tx.uuid] = { name: tx.player_name, profit: 0, ops: 0 };
      if (tx.transaction_type === 'SELL') tradersMap[tx.uuid].profit += tx.total_coins_exchanged;
      if (tx.transaction_type === 'BUY') tradersMap[tx.uuid].profit -= tx.total_coins_exchanged;
      tradersMap[tx.uuid].ops++;
    });

    const whales = Object.values(tradersMap)
      .filter(t => t.profit > 500)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    res.status(200).json({ candidates: topCandidates, whales: whales });
  } catch (error) {
    res.status(500).json({ error: "Error en inteligencia de mercado." });
  }
};

exports.getMarketNews = async (req, res) => {
  try {
    const timeLimit = new Date();
    timeLimit.setHours(timeLimit.getHours() - 12);

    const { data, error } = await supabase
      .from("market_news")
      .select("*")
      .gte("execute_at", timeLimit.toISOString())
      .order("execute_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo noticias del mercado." });
  }
};

exports.getAirdropStatus = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("market_airdrop_pot")
      .select("current_pot, last_payout, last_winner_name")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(200).json({
        current_pot: 0,
        last_payout: null,
        last_winner_name: "Nadie aún"
      });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo status del airdrop." });
  }
};

exports.getGlobalStatus = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("market_global_status")
      .select("climate, boss_active, current_influencer")
      .eq("id", 1)
      .single();

    if (error) throw error;
    res.status(200).json({
      climate: data.climate,
      bossActive: data.boss_active,
      influencer: data.current_influencer
    });
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo estado global del mercado." });
  }
};