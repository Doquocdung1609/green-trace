import { CalendarClock, FileText, MapPin, UserRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { AssetThumbnail } from "../../components/ui/AssetThumbnail";
import { ErrorState } from "../../components/ui/ErrorState";
import { FilterSelect, SearchInput } from "../../components/ui/Inputs";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { PageHeader } from "../../components/ui/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { api } from "../../services/apiClient";
import type { VerificationDecision, VerificationRequest, VerificationScope } from "../../types/domain";

type QueuePriority = "HIGH" | "MEDIUM" | "NORMAL";

function getPriority(request: VerificationRequest): QueuePriority {
  const waitingHours = (Date.now() - new Date(request.createdAt).getTime()) / 3_600_000;
  if (waitingHours >= 72) return "HIGH";
  if (waitingHours >= 24) return "MEDIUM";
  return "NORMAL";
}

export function VerificationRequests() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<VerificationDecision | "ALL">("ALL");
  const [assetType, setAssetType] = useState("ALL");
  const [region, setRegion] = useState("ALL");
  const [evidenceType, setEvidenceType] = useState("ALL");
  const [scope, setScope] = useState<VerificationScope | "ALL">("ALL");
  const [priority, setPriority] = useState<QueuePriority | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useQuery({ queryKey: ["verification-requests"], queryFn: () => api.get<{ requests: VerificationRequest[] }>("/verification-requests") });
  const allRequests = useMemo(() => data?.requests ?? [], [data]);
  const assetTypes = useMemo(() => [...new Set(allRequests.map((request) => request.asset?.assetType).filter(Boolean) as string[])].sort(), [allRequests]);
  const regions = useMemo(() => [...new Set(allRequests.map((request) => request.asset?.region).filter(Boolean) as string[])].sort(), [allRequests]);
  const scopes = useMemo(() => [...new Set(allRequests.map((request) => request.requestedScope))].sort(), [allRequests]);
  const evidenceTypes = useMemo(() => [...new Set(allRequests.map((request) => request.evidence?.type).filter(Boolean) as string[])].sort(), [allRequests]);
  const requests = useMemo(() => allRequests.filter((request) =>
    (status === "ALL" || request.status === status) &&
    (assetType === "ALL" || request.asset?.assetType === assetType) &&
    (region === "ALL" || request.asset?.region === region) &&
    (evidenceType === "ALL" || request.evidence?.type === evidenceType) &&
    (scope === "ALL" || request.requestedScope === scope) &&
    (priority === "ALL" || (request.status === "PENDING" && getPriority(request) === priority)) &&
    `${request.asset?.displayName} ${request.asset?.assetCode} ${request.evidence?.title} ${request.requester?.fullName}`.toLowerCase().includes(query.toLowerCase()),
  ), [allRequests, assetType, evidenceType, priority, query, region, scope, status]);
  const pageSize = 6;
  const pages = Math.max(1, Math.ceil(requests.length / pageSize));
  const rows = requests.slice((page - 1) * pageSize, page * pageSize);
  const selected = rows[0];
  if (isLoading) return <LoadingSkeleton label="Đang tải hàng đợi bằng chứng" />;
  if (error) return <ErrorState description="Không thể tải hàng đợi xác minh." />;
  return <div className="page-stack">
    <PageHeader eyebrow="Xác minh bằng chứng" title="Hàng đợi bằng chứng" description="Xem xét, kiểm tra nguồn và chỉ ký sau khi phạm vi kết luận đã rõ." />
    <section className="filter-bar">
      <SearchInput label="Tìm yêu cầu" placeholder="Tìm theo tên, mã, người gửi…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
      <FilterSelect label="Loại tài sản" value={assetType} onChange={(event) => { setAssetType(event.target.value); setPage(1); }}><option value="ALL">Tất cả loại</option>{assetTypes.map((item) => <option key={item}>{item}</option>)}</FilterSelect>
      <FilterSelect label="Khu vực" value={region} onChange={(event) => { setRegion(event.target.value); setPage(1); }}><option value="ALL">Tất cả khu vực</option>{regions.map((item) => <option key={item}>{item}</option>)}</FilterSelect>
      <FilterSelect label="Phạm vi" value={scope} onChange={(event) => { setScope(event.target.value as VerificationScope | "ALL"); setPage(1); }}><option value="ALL">Tất cả phạm vi</option>{scopes.map((item) => <option key={item}>{item}</option>)}</FilterSelect>
      <FilterSelect label="Loại bằng chứng" value={evidenceType} onChange={(event) => { setEvidenceType(event.target.value); setPage(1); }}><option value="ALL">Tất cả loại</option>{evidenceTypes.map((item) => <option key={item}>{item}</option>)}</FilterSelect>
      <FilterSelect label="Ưu tiên" value={priority} onChange={(event) => { setPriority(event.target.value as QueuePriority | "ALL"); setPage(1); }}><option value="ALL">Tất cả mức</option><option value="HIGH">Cao · chờ ≥ 72 giờ</option><option value="MEDIUM">Vừa · chờ ≥ 24 giờ</option><option value="NORMAL">Thông thường</option></FilterSelect>
      <FilterSelect label="Trạng thái" value={status} onChange={(event) => { setStatus(event.target.value as VerificationDecision | "ALL"); setPage(1); }}><option value="ALL">Tất cả</option><option value="PENDING">Đang chờ</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Đã từ chối</option><option value="EXPIRED">Hết hiệu lực</option></FilterSelect>
    </section>
    <div className="verification-layout">
      <section className="panel"><SectionHeader title={`Danh sách yêu cầu (${requests.length})`} description="Ưu tiên được suy ra từ thời gian chờ thực tế, không phải dữ liệu giả." />{rows.length ? <div className="page-stack">{rows.map((request) => { const queuePriority = getPriority(request); return <Link className="verification-card" key={request.id} to={`/verifier/requests/${request.id}`}><div className="verification-card-head"><div style={{ flexDirection: "row", gap: 10, alignItems: "center" }}><AssetThumbnail src={request.asset?.photoUrl} alt={request.asset?.displayName || "Tài sản"} size={64} /><span><strong>{request.asset?.displayName}</strong><small>{request.asset?.assetCode}</small><small><MapPin size={12} /> {request.asset?.region}</small></span></div><div className="status-stack">{request.status === "PENDING" ? <StatusBadge value={queuePriority === "HIGH" ? "DANGER" : queuePriority === "MEDIUM" ? "WARNING" : "INFO"} label={queuePriority === "HIGH" ? "Ưu tiên cao" : queuePriority === "MEDIUM" ? "Ưu tiên vừa" : "Thông thường"} /> : null}<StatusBadge value={request.status} /></div></div><p className="muted"><FileText size={13} /> {request.evidence?.title} · {new Date(request.createdAt).toLocaleString("vi-VN")}</p></Link>; })}</div> : <EmptyState title="Không có yêu cầu" description="Thay đổi bộ lọc hoặc chờ bằng chứng mới được gửi." />}<Pagination page={page} pages={pages} onChange={setPage} /></section>
      <aside className="panel">{selected ? <><SectionHeader title={selected.asset?.displayName || "Chi tiết yêu cầu"} description={selected.asset?.assetCode} /><div className="preview-placeholder"><AssetThumbnail src={selected.asset?.photoUrl} alt={selected.asset?.displayName || "Tài sản"} size={110} /><strong>{selected.evidence?.title}</strong><span>{selected.evidence?.type}</span></div><dl className="detail-list"><dt><UserRound size={16} /> Người gửi</dt><dd>{selected.requester?.fullName}</dd><dt><MapPin size={16} /> Khu vực</dt><dd>{selected.asset?.region}</dd><dt><CalendarClock size={16} /> Gửi lúc</dt><dd>{new Date(selected.createdAt).toLocaleString("vi-VN")}</dd><dt>Phạm vi</dt><dd>{selected.requestedScope}</dd><dt>Verifier category</dt><dd>{selected.requiredVerifierCategory ?? "Verifier độc lập"}</dd></dl><Link className="button primary wide" to={`/verifier/requests/${selected.id}`}>Mở kiểm tra chi tiết</Link></> : <EmptyState title="Chưa chọn yêu cầu" description="Danh sách hiện không có hồ sơ phù hợp." />}</aside>
    </div>
  </div>;
}
