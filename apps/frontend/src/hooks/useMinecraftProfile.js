import { useEffect, useState } from 'react';

const cache = {};

export default function useMinecraftProfile(username) {
  const [uuid, setUuid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!username) return;

    if (cache[username]) {
      setUuid(cache[username]);
      setLoading(false);
      return;
    }

    const fetchUUID = async () => {
      try {
        setLoading(true);
        const res = await fetch(`https://corsproxy.io/?https://api.mojang.com/users/profiles/minecraft/${username}`);
        if (!res.ok) throw new Error("Usuario no encontrado");

        const data = await res.json();
        cache[username] = data.id;
        setUuid(data.id);
      } catch (err) {
        console.error(err);
        setError(err.message);
        setUuid(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUUID();
  }, [username]);

  return { uuid, loading, error };
}
