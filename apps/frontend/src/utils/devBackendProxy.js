if (import.meta.env.MODE === "development" && typeof window !== "undefined") {
  const ORIGINAL_FETCH = window.fetch;

  const RENDER_BASE = "https://flancraft-backend.onrender.com";
  const LOCAL_BASE = "http://localhost:10000";

  window.fetch = async (input, init) => {
    try {
      if (typeof input === "string" && input.startsWith(RENDER_BASE)) {
        const newUrl = LOCAL_BASE + input.slice(RENDER_BASE.length);
        return ORIGINAL_FETCH(newUrl, init);
      }

      if (input instanceof URL && input.href.startsWith(RENDER_BASE)) {
        const newUrl = LOCAL_BASE + input.href.slice(RENDER_BASE.length);
        return ORIGINAL_FETCH(newUrl, init);
      }

      if (input instanceof Request && input.url.startsWith(RENDER_BASE)) {
        const newUrl = LOCAL_BASE + input.url.slice(RENDER_BASE.length);
        const newRequest = new Request(newUrl, input);
        return ORIGINAL_FETCH(newRequest, init);
      }
    } catch {
      // ignore
    }

    return ORIGINAL_FETCH(input, init);
  };
}
