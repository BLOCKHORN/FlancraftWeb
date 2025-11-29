// src/utils/devBackendProxy.js

// Solo aplicamos el parche en desarrollo y en navegador
if (import.meta.env.MODE === "development" && typeof window !== "undefined") {
  const ORIGINAL_FETCH = window.fetch;

  const RENDER_BASE = "https://flancraft-backend.onrender.com";
  const LOCAL_BASE = "http://localhost:10000";

  console.log(
    "[devBackendProxy] Activado. Redirigiendo llamadas a Render → backend local."
  );

  window.fetch = async (input, init) => {
    try {
      // Caso fetch("url", ...)
      if (typeof input === "string" && input.startsWith(RENDER_BASE)) {
        const newUrl = LOCAL_BASE + input.slice(RENDER_BASE.length);
        // console.log("[devBackendProxy] string:", input, "→", newUrl);
        return ORIGINAL_FETCH(newUrl, init);
      }

      // Caso fetch(new URL(...), ...)
      if (input instanceof URL && input.href.startsWith(RENDER_BASE)) {
        const newUrl = LOCAL_BASE + input.href.slice(RENDER_BASE.length);
        // console.log("[devBackendProxy] URL:", input.href, "→", newUrl);
        return ORIGINAL_FETCH(newUrl, init);
      }

      // Caso fetch(new Request(...), ...)
      if (input instanceof Request && input.url.startsWith(RENDER_BASE)) {
        const newUrl = LOCAL_BASE + input.url.slice(RENDER_BASE.length);
        const newRequest = new Request(newUrl, input);
        // console.log("[devBackendProxy] Request:", input.url, "→", newUrl);
        return ORIGINAL_FETCH(newRequest, init);
      }
    } catch (err) {
      console.warn("[devBackendProxy] Error al reescribir fetch:", err);
    }

    // Cualquier otra petición (Supabase, otras APIs) sigue tal cual
    return ORIGINAL_FETCH(input, init);
  };
}
