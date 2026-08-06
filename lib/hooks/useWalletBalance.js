"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";

/**
 * Fetches the signed-in user's wallet balance (canonical USD) and exposes a
 * `refresh` callback so the wallet page can re-sync after a top-up. Returns
 * `balance: null` when signed out or before the first successful fetch.
 */
export default function useWalletBalance() {
  const { isLoaded: userLoaded, user } = useUser();
  const { getToken } = useAuth();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userLoaded || !user) {
      setBalance(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/wallet/balance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalance(data.balance ?? 0);
      return data.balance ?? 0;
    } catch {
      setBalance(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [userLoaded, user, getToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { balance, loading, refresh };
}
