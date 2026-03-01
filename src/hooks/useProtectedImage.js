import { useEffect, useState } from "react";
import { clearSession } from "@/api/adminMe";
import { toApiUrl } from "@/utils/toApiUrl";

export function useProtectedImage({ url, token, enabled = true }) {
  const [src, setSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !url) {
      setSrc("");
      setLoading(false);
      setError(null);
      return undefined;
    }

    const controller = new AbortController();
    const imageUrl = toApiUrl(url);
    let objectUrl = "";
    let revoked = false;

    setLoading(true);
    setError(null);
    setSrc("");

    (async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(imageUrl, {
          method: "GET",
          headers,
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          const requestError = new Error(`Image request failed with HTTP ${response.status}`);
          requestError.status = response.status;

          if (response.status === 401) {
            clearSession();
            window.dispatchEvent(new Event("auth:logout"));
          }

          throw requestError;
        }

        const blob = await response.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(requestError);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => {
      controller.abort();
      if (objectUrl && !revoked) {
        URL.revokeObjectURL(objectUrl);
        revoked = true;
      }
    };
  }, [enabled, token, url]);

  return { src, loading, error };
}

export default useProtectedImage;
