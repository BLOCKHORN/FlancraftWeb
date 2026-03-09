import { useEffect, useState } from "react";

const SCRIPT_ID = "fc-tebex-script";
const SCRIPT_SRC = "https://js.tebex.io/v/1.js";

export default function useTebexScript(shouldLoad = true) {
  const [loaded, setLoaded] = useState(() => typeof window !== "undefined" && Boolean(window.Tebex));

  useEffect(() => {
    if (!shouldLoad || typeof document === "undefined") return;
    if (window.Tebex) {
      setLoaded(true);
      return;
    }

    let script = document.getElementById(SCRIPT_ID);
    const onLoad = () => setLoaded(true);

    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.defer = true;
      script.addEventListener("load", onLoad);
      document.head.appendChild(script);
    } else {
      script.addEventListener("load", onLoad);
    }

    return () => {
      script?.removeEventListener("load", onLoad);
    };
  }, [shouldLoad]);

  return loaded;
}
