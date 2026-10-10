import { useEffect, useState } from "react";
import { axiosInstance } from "../config/api";
import { summarizeChain } from "./recruitmentWorkflow";

// Re-verifies every signed step of a recruitment request on the server.
// Returns { results: { [historyEntryId]: result }, loading, error }
export default function useHistoryVerification(recruitment, enabled = true) {
  const [state, setState] = useState({
    results: {},
    loading: false,
    error: null,
  });

  const id = recruitment?._id;
  const steps = recruitment?.history?.length || 0;

  useEffect(() => {
    if (!enabled || !id) return;

    let cancelled = false;

    setState((current) => ({ ...current, loading: true, error: null }));

    axiosInstance
      .get(`/api/recruitment/${id}/verify-history`)
      .then((res) => {
        if (cancelled) return;

        const results = {};

        (res.data.results || []).forEach((result) => {
          results[result.entryId] = result;
        });

        setState({ results, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;

        setState({
          results: {},
          loading: false,
          error: err.response?.data?.message || "Verification failed",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [id, steps, enabled]);

  return state;
}

// Verifies the whole signature chain of each request in the list.
// Returns { [recruitmentId]: summarizeChain(...) }; missing while loading.
export function usePreviousSignatureChecks(recruitments) {
  const [checks, setChecks] = useState({});

  // Re-run only when a request is added or gets a new signed step
  const key = recruitments
    .map((r) => `${r._id}:${r.history?.length || 0}`)
    .join(",");

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      recruitments.map(async (recruitment) => {
        try {
          const res = await axiosInstance.get(
            `/api/recruitment/${recruitment._id}/verify-history`,
          );

          return [recruitment._id, summarizeChain(res.data.results)];
        } catch (err) {
          return [
            recruitment._id,
            {
              status: "unverifiable",
              message: err.response?.data?.message || "Verification failed",
            },
          ];
        }
      }),
    ).then((entries) => {
      if (!cancelled) setChecks(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return checks;
}
