"use client";

// ---------------------------------------------------------------------
// Generic async data hook.
//
// Loads a value with a reference that can change (e.g. an effect dep),
// tracks loading / error, and exposes a manual reload(). Safe against
// setting state after unmount.
// ---------------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: (ref?: unknown) => Promise<T | null>;
}

export function useAsyncData<T>(loader: (ref: unknown) => Promise<T>, initialRef: unknown = null): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const run = useCallback(async (ref: unknown = initialRef): Promise<T | null> => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loader(ref);
      if (id === requestId.current) setData(result);
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong while loading data.";
      if (id === requestId.current) {
        setError(message);
        setData(null);
      }
      return null;
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [loader, initialRef]);

  useEffect(() => {
    // Defer the first load out of the effect body so the loading state is set
    // after paint (keeps the initial render serialisable).
    const t = window.setTimeout(() => void run(initialRef), 0);
    return () => window.clearTimeout(t);
  }, [initialRef, run]);

  return { data, loading, error, reload: run };
}