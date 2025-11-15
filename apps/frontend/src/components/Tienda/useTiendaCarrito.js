// src/components/Tienda/useTiendaCarrito.js
import { useState, useEffect } from "react";

/**
 * Hook de carrito de la tienda.
 * Guarda el carrito por jugador en localStorage: carrito-{nombreJugador}
 */
export function useTiendaCarrito(nombreJugador) {
  const storageKey = `carrito-${nombreJugador || "anonimo"}`;

  const [carrito, setCarrito] = useState(() => {
    try {
      const guardado = localStorage.getItem(storageKey);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(carrito));
    } catch {
      // si falla localStorage, simplemente seguimos
    }
  }, [carrito, storageKey]);

  const toggleProducto = (producto) => {
    setCarrito((prev) => {
      const existe = prev.find((p) => p.id === producto.id);
      if (existe) return prev.filter((p) => p.id !== producto.id);
      return [...prev, producto];
    });
  };

  return { carrito, toggleProducto };
}
