import { useEffect, useMemo } from "react";
import { useProtectedImage } from "@/hooks/useProtectedImage";

export function ProtectedIncidentImage({
  imageUrl,
  adminJwt,
  alt = "Incident image",
  className = "",
  fallbackSrc = "",
  fallbackClassName = "flex items-center justify-center rounded-md border bg-muted/30 text-xs text-muted-foreground",
  loadingClassName = "flex items-center justify-center rounded-md border bg-muted/20 text-xs text-muted-foreground",
  fallbackText = "Image unavailable",
  loadingText = "Loading image...",
  onLoadError,
}) {
  const token = useMemo(() => adminJwt || localStorage.getItem("admin_token") || "", [adminJwt]);
  const { src, loading, error } = useProtectedImage({
    url: imageUrl,
    token,
    enabled: Boolean(imageUrl),
  });

  useEffect(() => {
    if (!error) return;
    onLoadError?.(error);
  }, [error, onLoadError]);

  if (!imageUrl) {
    if (fallbackSrc) return <img src={fallbackSrc} alt={alt} className={className} />;
    return <div className={`${fallbackClassName} ${className}`.trim()}>{fallbackText}</div>;
  }

  if (loading) {
    return <div className={`${loadingClassName} ${className}`.trim()}>{loadingText}</div>;
  }

  if (src) {
    return <img src={src} alt={alt} className={className} />;
  }

  if (fallbackSrc) {
    return <img src={fallbackSrc} alt={alt} className={className} />;
  }

  return <div className={`${fallbackClassName} ${className}`.trim()}>{fallbackText}</div>;
}

export default ProtectedIncidentImage;
