(function () {
  let hookApplied = false;

  function applyPatch() {
    if (!window.lucide || typeof window.lucide.attachIcon !== "function") return;
    if (hookApplied) return;
    hookApplied = true;

    const original = window.lucide.attachIcon;
    window.lucide.attachIcon = function (...args) {
      try {
        return original(...args);
      } catch (e) {
        console.warn("⚠️ attachIcon bloqueado:", e.message);
        return null;
      }
    };
  }

  if (window.lucide) {
    applyPatch();
  }

  Object.defineProperty(window, "lucide", {
    configurable: true,
    set(val) {
      this._lucide = val;
      applyPatch();
    },
    get() {
      return this._lucide;
    },
  });

  window.addEventListener("DOMContentLoaded", () => {
    applyPatch();
  });
})();
