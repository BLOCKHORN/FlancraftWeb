const supabase = require("../models/db");

exports.getLivePrices = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("market_live_prices")
      .select("*")
      .order("current_coin_price", { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo precios de mercado." });
  }
};

exports.getPortfolio = async (req, res) => {
  try {
    const { uuid } = req.params;
    if (!uuid) return res.status(400).json({ error: "UUID requerido." });

    const [portfolioRes, liquidRes] = await Promise.all([
      supabase.from("market_portfolios").select("*").eq("uuid", uuid),
      supabase.from("monedas_actuales").select("coins").eq("uuid", uuid).limit(1)
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
    const { data, error } = await supabase
      .from("market_transactions_ledger")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(50);

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo transacciones." });
  }
};

exports.getChartData = async (req, res) => {
  try {
    const { mineral } = req.params;
    if (!mineral) return res.status(400).json({ error: "Mineral requerido." });

    const { data, error } = await supabase
      .from("market_transactions_ledger")
      .select("price_per_share, timestamp")
      .eq("mineral_id", mineral.toUpperCase())
      .order("timestamp", { ascending: true })
      .limit(100);

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Error obteniendo datos del gráfico." });
  }
};

exports.getTopTraders = async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_top_traders');
    
    if (error) {
       const { data: fallbackData, error: fallbackError } = await supabase
        .from('market_transactions_ledger')
        .select('uuid, player_name, transaction_type, total_coins_exchanged');
        
       if (fallbackError) throw fallbackError;

       const traders = {};
       fallbackData.forEach(tx => {
         if (!traders[tx.uuid]) traders[tx.uuid] = { name: tx.player_name, profit: 0 };
         if (tx.transaction_type === 'SELL') traders[tx.uuid].profit += tx.total_coins_exchanged;
         if (tx.transaction_type === 'BUY') traders[tx.uuid].profit -= tx.total_coins_exchanged;
       });

       const sorted = Object.values(traders)
         .filter(t => t.profit !== 0)
         .sort((a, b) => b.profit - a.profit)
         .slice(0, 10);
         
       return res.status(200).json(sorted);
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Error calculando Top Traders." });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { uuid, playerName, mineralId, type, amount } = req.body;

    if (!uuid || !playerName || !mineralId || !type || !amount) {
      return res.status(400).json({ error: "Faltan parámetros en la orden." });
    }

    if (type !== "BUY" && type !== "SELL") {
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
          mineral_id: mineralId.toUpperCase(),
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
        "DIAMOND", "GOLD_INGOT", "IRON_INGOT", "EMERALD", "NETHERITE_INGOT", "COAL",
        "RAW_COPPER", "CHORUS_FRUIT", "FLINT", "QUARTZ"
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
      .filter(item => item.cash > 2000) // Solo items con impacto real (>2k coins)
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