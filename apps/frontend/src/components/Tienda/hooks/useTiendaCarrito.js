import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { normalizeProductForCart } from "../utils/tiendaHelpers";
import { apiUrl } from "../../../lib/env";

function clampInt(n, min, max) {
  const x = Math.trunc(Number(n));
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function readCart(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(key, cart) {
  try {
    localStorage.setItem(key, JSON.stringify(cart));
  } catch {}
}

function normalizeToCartRow(input, qty = 1) {
  if (!input) return null;

  const normalized =
    input?.id != null && input?.name != null && input?.price != null
      ? input
      : normalizeProductForCart(input, qty);

  if (!normalized) return null;

  const idNum = Number(normalized.id);
  if (!Number.isFinite(idNum)) return null;

  const priceNum = Number(normalized.price);
  const price = Number.isFinite(priceNum) ? priceNum : 0;

  const q = normalized.quantity ?? normalized.cantidad ?? normalized.qty ?? normalized.cant ?? qty;

  const image = normalized.image ?? normalized.image_url ?? normalized.imageUrl ?? normalized.img ?? normalized.icon ?? null;

  return {
    id: idNum,
    name: String(normalized.name || `Producto ${idNum}`),
    price,
    image: image ? String(image) : null,
    quantity: clampInt(q, 1, 999),
  };
}

function mergeCarts(base = [], extra = []) {
  const map = new Map();
  for (const it of base) {
    const row = normalizeToCartRow(it, it?.quantity ?? it?.cantidad ?? 1);
    if (!row) continue;
    map.set(String(row.id), row);
  }
  for (const it of extra) {
    const row = normalizeToCartRow(it, it?.quantity ?? it?.cantidad ?? 1);
    if (!row) continue;
    const key = String(row.id);
    if (!map.has(key)) {
      map.set(key, row);
    } else {
      const prev = map.get(key);
      map.set(key, {
        ...prev,
        quantity: clampInt((prev?.quantity || 1) + (row?.quantity || 1), 1, 999),
      });
    }
  }
  return Array.from(map.values());
}

export default function useTiendaCarrito(nombreJugador) {
  const storageKey = useMemo(() => {
    const n = String(nombreJugador || "").trim().toLowerCase();
    return `carrito-${n || "anonimo"}`;
  }, [nombreJugador]);

  const prevKeyRef = useRef(storageKey);
  const [carrito, setCarrito] = useState([]);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    setHidratado(false);
    const prevKey = prevKeyRef.current;
    const nextKey = storageKey;
    prevKeyRef.current = nextKey;

    const nextCart = readCart(nextKey);
    const prevWasAnon = String(prevKey).includes("carrito-anonimo");
    const nextIsAnon = String(nextKey).includes("carrito-anonimo");

    if (prevWasAnon && !nextIsAnon) {
      const anonCart = readCart(prevKey);
      if (anonCart.length > 0) {
        const merged = mergeCarts(nextCart, anonCart);
        setCarrito(merged);
        writeCart(nextKey, merged);
        try { localStorage.removeItem(prevKey); } catch {}
        setHidratado(true);
        return;
      }
    }
    setCarrito(mergeCarts(nextCart, []));
    setHidratado(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hidratado) return;
    writeCart(storageKey, carrito);
  }, [carrito, storageKey, hidratado]);

  // OPTIMIZACIÓN: Usar useCallback para que las funciones no cambien en cada render
  const agregar = useCallback((producto, qty = 1) => {
    const add = clampInt(qty, 1, 999);
    const row = normalizeToCartRow(producto, add);
    if (!row?.id) return;

    setCarrito((prev) => {
      const idx = prev.findIndex((p) => String(p?.id) === String(row.id));
      if (idx >= 0) {
        const next = [...prev];
        const cur = clampInt(next[idx]?.quantity || 1, 1, 999);
        next[idx] = { ...next[idx], quantity: clampInt(cur + add, 1, 999) };
        return next;
      }
      return [...prev, { ...row, quantity: add }];
    });
  }, []);

  const toggleProducto = useCallback((producto) => {
    const row = normalizeToCartRow(producto, 1);
    if (!row?.id) return;
    setCarrito((prev) => {
      const idx = prev.findIndex((p) => String(p?.id) === String(row.id));
      if (idx >= 0) return prev.filter((p) => String(p?.id) !== String(row.id));
      return [...prev, { ...row, quantity: 1 }];
    });
  }, []);

  const eliminar = useCallback((id) => {
    setCarrito((prev) => prev.filter((p) => String(p?.id) !== String(id)));
  }, []);

  const vaciar = useCallback(() => setCarrito([]), []);

  const setCantidad = useCallback((id, qty, itemOptional) => {
    const q = clampInt(qty, 0, 999);
    setCarrito((prev) => {
      const idx = prev.findIndex((p) => String(p?.id) === String(id));
      if (q <= 0) {
        if (idx < 0) return prev;
        return prev.filter((p) => String(p?.id) !== String(id));
      }
      if (idx < 0) {
        const row = normalizeToCartRow(itemOptional, q);
        if (!row?.id) return prev;
        return [...prev, { ...row, quantity: clampInt(q, 1, 999) }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: clampInt(q, 1, 999) };
      return next;
    });
  }, []);

  const cambiarCantidad = useCallback((id, delta, itemOptional) => {
    const d = clampInt(delta, -999, 999);
    setCarrito((prev) => {
      const idx = prev.findIndex((p) => String(p?.id) === String(id));
      if (idx < 0) {
        if (d > 0) {
          const row = normalizeToCartRow(itemOptional, d);
          if (!row?.id) return prev;
          return [...prev, { ...row, quantity: clampInt(d, 1, 999) }];
        }
        return prev;
      }
      const cur = clampInt(prev[idx]?.quantity || 1, 1, 999);
      const nextQty = clampInt(cur + d, 0, 999);
      if (nextQty <= 0) return prev.filter((p) => String(p?.id) !== String(id));
      const next = [...prev];
      next[idx] = { ...next[idx], quantity: clampInt(nextQty, 1, 999) };
      return next;
    });
  }, []);

  const total = useMemo(() => {
    return carrito.reduce((acc, it) => {
      const price = Number(it?.price) || 0;
      const qty = clampInt(it?.quantity || 1, 1, 999);
      return acc + price * qty;
    }, 0);
  }, [carrito]);

  // EFECTO WELCOME PACK: Ahora es 100% estable gracias a useCallback
  useEffect(() => {
    const playerName = String(nombreJugador || "").trim();
    if (!hidratado || !playerName || playerName.toLowerCase() === "anonimo") return;

    const pending = localStorage.getItem("fc_pending_welcome_pack");
    if (pending === "true") {
      localStorage.removeItem("fc_pending_welcome_pack");

      fetch(apiUrl(`/api/tebex/bienvenida/status?jugador=${encodeURIComponent(playerName)}`))
        .then((res) => res.json())
        .then((data) => {
          if (data?.shouldShow && data?.pack) {
            agregar(data.pack, 1);
          }
        })
        .catch(() => {});
    }
  }, [hidratado, nombreJugador, agregar]);

  return {
    carrito,
    toggleProducto,
    agregar,
    eliminar,
    vaciar,
    total,
    cambiarCantidad,
    setCantidad,
  };
}