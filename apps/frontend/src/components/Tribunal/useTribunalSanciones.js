import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function useTribunalSanciones() {
  const [sanciones, setSanciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancel = false;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");

        const { data, error } = await supabase
          .from("jails")
          .select("*")
          .eq("server", "survival")
          .order("timestamp", { ascending: false });

        if (error) throw error;
        if (!cancel) setSanciones(data || []);
      } catch (e) {
        console.error(e);
        if (!cancel) setErrorMsg("No se pudo cargar el historial de sanciones.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  return { sanciones, loading, errorMsg };
}