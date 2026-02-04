import { useEffect, useMemo, useRef, useState } from "react";

function getId(producto) {
  return (
    producto?.id ??
    producto?.package_id ??
    producto?.packageId ??
    producto?.productoId ??
    null
  );
}

function normalize(producto) {
  const id = getId(producto);
  if (!id) return null;

  const name =
    producto?.name ||
    producto?.nombre ||
    producto?.title ||
    producto?.display_name ||
    `Producto ${id}`;

  const priceRaw =
    producto?.price ??
    producto?.final_price ??
    producto?.total ??
    producto?.precio ??
    0;

  const price = Number(priceRaw) || 0;

  const image =
    producto?.image ||
    producto?.img ||
    producto?.icon ||
    producto?.image_url ||
    producto?.imageUrl ||
    null;

  const quantity = Number(producto?.quantity || 1) || 1;

  return {
    id: Number(id),
    name,
    price,
    image,
    quantity,
  };
}

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
  } catch {
    // no-op
  }
}

function mergeCarts(base = [], extra = []) {
  const map = new Map();

  for (const it of base) {
    const id = String(it?.id);
    if (!id) continue;
    map.set(id, { ...it, quantity: clampInt(it?.quantity || 1, 1, 999) });
  }

  for (const it of extra) {
    const id = String(it?.id);
    if (!id) continue;
    const qty = clampInt(it?.quantity || 1, 1, 999);
    if (!map.has(id)) {
      map.set(id, { ...it, quantity: qty });
    } else {
      const prev = map.get(id);
      map.set(id, {
        ...prev,
        quantity: clampInt((prev?.quantity || 1) + qty, 1, 999),
      });
    }
  }

  return Array.from(map.values());
}

/**
 * Carrito por jugador:
 * localStorage: carrito-{nombreLower}
 * + migración automática carrito-anonimo -> carrito-{jugador}
 */
export default function useTiendaCarrito(nombreJugador) {
  const storageKey = useMemo(() => {
    const n = String(nombreJugador || "").trim().toLowerCase();
    return `carrito-${n || "anonimo"}`;
  }, [nombreJugador]);

  const prevKeyRef = useRef(storageKey);

  const [carrito, setCarrito] = useState([]);
  const [hidratado, setHidratado] = useState(false); // ✅ clave

  // ✅ Cargar carrito cuando cambia el jugador (o al montar)
  useEffect(() => {
    setHidratado(false);

    const prevKey = prevKeyRef.current;
    const nextKey = storageKey;
    prevKeyRef.current = nextKey;

    const nextCart = readCart(nextKey);

    const prevWasAnon = String(prevKey).includes("carrito-anonimo");
    const nextIsAnon = String(nextKey).includes("carrito-anonimo");

    // ✅ Migración SOLO si venimos de anonimo y entramos a un usuario real
    if (prevWasAnon && !nextIsAnon) {
      const anonCart = readCart(prevKey);
      if (anonCart.length > 0) {
        const merged = mergeCarts(nextCart, anonCart);
        setCarrito(merged);
        writeCart(nextKey, merged);
        try {
          localStorage.removeItem(prevKey);
        } catch {
          // no-op
        }
        setHidratado(true);
        return;
      }
    }

    setCarrito(nextCart);
    setHidratado(true);
  }, [storageKey]);

  // ✅ Persistir SOLO cuando ya se ha cargado (evita borrar al refrescar)
  useEffect(() => {
    if (!hidratado) return;
    writeCart(storageKey, carrito);
  }, [carrito, storageKey, hidratado]);

  const agregar = (producto, qty = 1) => {
    const item = normalize(producto);
    if (!item?.id) return;

    const add = clampInt(qty, 1, 999);

    setCarrito((prev) => {
      const idx = prev.findIndex((p) => String(p?.id) === String(item.id));
      if (idx >= 0) {
        const next = [...prev];
        const cur = clampInt(next[idx]?.quantity || 1, 1, 999);
        next[idx] = { ...next[idx], quantity: clampInt(cur + add, 1, 999) };
        return next;
      }
      return [...prev, { ...item, quantity: add }];
    });
  };

  const toggleProducto = (producto) => {
    const item = normalize(producto);
    if (!item?.id) return;

    setCarrito((prev) => {
      const idx = prev.findIndex((p) => String(p?.id) === String(item.id));
      if (idx >= 0) return prev.filter((p) => String(p?.id) !== String(item.id));
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const eliminar = (id) => {
    setCarrito((prev) => prev.filter((p) => String(p?.id) !== String(id)));
  };

  const vaciar = () => setCarrito([]);

  const setCantidad = (id, qty, itemOptional) => {
    const q = clampInt(qty, 0, 999);

    setCarrito((prev) => {
      const idx = prev.findIndex((p) => String(p?.id) === String(id));

      if (q <= 0) {
        if (idx < 0) return prev;
        return prev.filter((p) => String(p?.id) !== String(id));
      }

      if (idx < 0) {
        const norm = normalize(itemOptional);
        if (!norm?.id) return prev;
        return [...prev, { ...norm, quantity: clampInt(q, 1, 999) }];
      }

      const next = [...prev];
      next[idx] = { ...next[idx], quantity: clampInt(q, 1, 999) };
      return next;
    });
  };

  const cambiarCantidad = (id, delta, itemOptional) => {
    const d = clampInt(delta, -999, 999);

    setCarrito((prev) => {
      const idx = prev.findIndex((p) => String(p?.id) === String(id));
      if (idx < 0) {
        if (d > 0) {
          const norm = normalize(itemOptional);
          if (!norm?.id) return prev;
          return [...prev, { ...norm, quantity: clampInt(d, 1, 999) }];
        }
        return prev;
      }

      const cur = clampInt(prev[idx]?.quantity || 1, 1, 999);
      const nextQty = clampInt(cur + d, 0, 999);

      if (nextQty <= 0) {
        return prev.filter((p) => String(p?.id) !== String(id));
      }

      const next = [...prev];
      next[idx] = { ...next[idx], quantity: clampInt(nextQty, 1, 999) };
      return next;
    });
  };

  const total = useMemo(() => {
    return carrito.reduce(
      (acc, it) =>
        acc + (Number(it.price) || 0) * clampInt(it.quantity || 1, 1, 999),
      0
    );
  }, [carrito]);

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