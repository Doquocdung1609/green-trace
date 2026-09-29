import { CalendarDays, Download, Leaf, MapPin, PackageOpen } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Asset, Evidence, VerificationRequest } from "../../types/domain";
import { AssetThumbnail } from "./AssetThumbnail";
import { StatusBadge } from "./StatusBadge";

export function PassportCard({ asset, onExport }: { asset: Asset; onExport?: (asset: Asset) => void }) {
  const score = asset.trustProfile?.totalScore ?? 0;
  return <article className="passport-card"><div className="passport-card-media"><img src={asset.photoUrl || "/assets/demo/ginseng-field.svg"} alt={`Ảnh minh họa ${asset.displayName}`} /><span className="passport-card-status"><StatusBadge value={asset.passportStatus} /></span><span className="passport-card-score"><strong>{score}</strong>/100</span></div><div className="passport-card-body"><small>{asset.assetCode}</small><h2>{asset.displayName}</h2><div className="passport-card-meta"><span><MapPin size={14} />{asset.region}</span><span><Leaf size={14} />{asset.species}</span><span><PackageOpen size={14} />{asset.assetType}</span><span><CalendarDays size={14} />{new Date(asset.plantedAt).toLocaleDateString("vi-VN")}</span></div><div className="card-actions"><Link className="button primary" to={`/passport/${asset.assetCode}`}>Mở hộ chiếu</Link>{onExport ? <button className="button secondary" type="button" onClick={() => onExport(asset)} aria-label={`Tải tóm tắt ${asset.displayName}`}><Download size={17} /> Tải</button> : null}</div></div></article>;
}

export function EvidenceCard({ evidence, action }: { evidence: Evidence; action?: ReactNode }) {
  return <article className="evidence-card"><div className="evidence-card-head"><div><strong>{evidence.title}</strong><small>{evidence.type} · {evidence.source}</small></div><StatusBadge value={evidence.verificationStatus} /></div><p className="muted">Quan sát {new Date(evidence.observedAt).toLocaleString("vi-VN")}</p>{action}</article>;
}

export function VerificationCard({ request }: { request: VerificationRequest }) {
  return <Link className="verification-card" to={`/verifier/requests/${request.id}`}><div className="verification-card-head"><div style={{ flexDirection: "row", gap: 10, alignItems: "center" }}><AssetThumbnail src={request.asset?.photoUrl} alt={request.asset?.displayName || "Tài sản"} /><span><strong>{request.asset?.displayName}</strong><small>{request.asset?.assetCode} · {request.evidence?.title}</small></span></div><StatusBadge value={request.status} /></div><p className="muted">Phạm vi: {request.requestedScope} · Gửi {new Date(request.createdAt).toLocaleString("vi-VN")}</p></Link>;
}
