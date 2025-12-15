// apps/frontend/src/components/Tienda/useTiendaCarrito.js
import { useEffect, useMemo, useState } from "react";

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
    null;

  return {
    id: Number(id),
    name,
    price,
    image,
    quantity: Number(producto?.quantity || 1) || 1,
  };
}

/**
 * Carrito por jugador:
 * localStorage: carrito-{nombreLower}
 */
export function useTiendaCarrito(nombreJugador) {
  const storageKey = useMemo(() => {
    const n = String(nombreJugador || "anonimo").trim().toLowerCase();
    return `carrito-${n || "anonimo"}`;
  }, [nombreJugador]);

  const [carrito, setCarrito] = useState([]);

  // Cargar carrito cuando cambia el jugador (o al montar)
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(storageKey);
      const parsed = guardado ? JSON.parse(guardado) : [];
      setCarrito(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCarrito([]);
    }
  }, [storageKey]);

  // Persistir
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(carrito));
    } catch {
      // no-op
    }
  }, [carrito, storageKey]);

  const toggleProducto = (producto) => {
    const item = normalize(producto);
    if (!item?.id) return;

    setCarrito((prev) => {
      const existe = prev.some((p) => String(p?.id) === String(item.id));
      if (existe) return prev.filter((p) => String(p?.id) !== String(item.id));
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const eliminar = (id) => {
    setCarrito((prev) => prev.filter((p) => String(p?.id) !== String(id)));
  };

  const vaciar = () => setCarrito([]);

  const total = useMemo(() => {
    return carrito.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  }, [carrito]);

  return { carrito, toggleProducto, eliminar, vaciar, total };
}
export default useTiendaCarrito;
