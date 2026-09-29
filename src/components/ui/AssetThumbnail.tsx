export function AssetThumbnail({ src, alt, fallback = "GT", size }: { src?: string | null; alt: string; fallback?: string; size?: number }) {
  return <span className="asset-thumbnail" style={size ? { width: size, height: size } : undefined}>{src ? <img src={src} alt={alt} /> : <span aria-hidden="true">{fallback}</span>}</span>;
}
