(function () {
  const patchLucide = (instance) => {
    if (!instance || instance.isPatched) return;

    const originalAttach = instance.attachIcon;
    if (typeof originalAttach === "function") {
      instance.attachIcon = (...args) => {
        try {
          return originalAttach.apply(instance, args);
        } catch (e) {
          console.warn("🛡️ FlanCraft Shield:", e.message);
          return null;
        }
      };
      instance.isPatched = true;
    }
  };

  let _lucide = window.lucide;
  patchLucide(_lucide);

  Object.defineProperty(window, "lucide", {
    get: () => _lucide,
    set: (val) => {
      _lucide = val;
      patchLucide(_lucide);
    },
    configurable: true
  });
})();