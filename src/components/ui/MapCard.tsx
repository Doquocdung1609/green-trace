import { MapPin } from "lucide-react";

export function MapCard({ region, latitude, longitude }: { region: string; latitude?: number; longitude?: number }) {
  const hasCoordinates = latitude !== undefined && longitude !== undefined;
  return <section className="map-card" aria-label="Vị trí tài sản"><div className="map-visual"><span className="map-pin"><MapPin size={34} /></span></div><div className="map-details"><strong>Vị trí đã chọn</strong><span>{region || "Chưa chọn khu vực"}</span><span>{hasCoordinates ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)} (WGS84)` : "Nhập tọa độ để xem tóm tắt vị trí"}</span><span>Bản minh họa, không phải bản đồ tương tác.</span></div></section>;
}
