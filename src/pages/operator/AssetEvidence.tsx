import {
  AlertTriangle,
  ClipboardCheck,
  Copy,
  ExternalLink,
  Eye,
  FileCheck2,
  FilePlus2,
  History,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  Sprout,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { SolanaWalletButton } from "../../components/SolanaWalletButton";
import { StatusPill } from "../../components/StatusPill";
import { AssetThumbnail } from "../../components/ui/AssetThumbnail";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { TabNav } from "../../components/ui/TabNav";
import { useToast } from "../../hooks/useToast";
import { config } from "../../lib/config";
import { api } from "../../services/apiClient";
import { getSolanaExplorerUrl } from "../../solana/explorer";
import { useSolanaWallet } from "../../solana/useSolanaWallet";
import { AssetProductSections, type ProductTab } from "../../components/asset/AssetProductSections";
import {
  stageLabels,
  type Asset,
  type Evidence,
  type EvidenceType,
  type LifecycleStage,
} from "../../types/domain";

type WorkspaceTab = "overview" | "evidence" | "requests" | "lifecycle" | "warnings" | "passport" | ProductTab;

export function AssetEvidence() {
  const { id = "" } = useParams();
  const client = useQueryClient();
  const { notify } = useToast();
  const wallet = useSolanaWallet();
  const [error, setError] = useState("");
  const [tab, setTab] = useState<WorkspaceTab>("evidence");
  const [evidenceType, setEvidenceType] = useState<EvidenceType>("PHOTO");
  const [stageTo, setStageTo] = useState<LifecycleStage>("PLANTED_VERIFIED");
  const [evidenceBusy, setEvidenceBusy] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [confirmPassport, setConfirmPassport] = useState(false);
  const [passportBusy, setPassportBusy] = useState(false);
  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ["asset", id],
    queryFn: () => api.get<{ asset: Asset }>(`/assets/${id}`),
  });
  const recalculate = useMutation({
    mutationFn: () => api.post(`/assets/${id}/recalculate-trust`),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["asset", id] });
      notify("Đã tính lại điểm tin cậy");
    },
    onError: (reason) => notify("Không thể tính lại điểm", { description: reason instanceof Error ? reason.message : "Vui lòng thử lại.", tone: "error" }),
  });

  const submitEvidence = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const body = new FormData(form);
    const validFrom = String(body.get("validFrom") ?? "");
    const validUntil = String(body.get("validUntil") ?? "");
    if (!validFrom) body.delete("validFrom");
    if (!validUntil) body.delete("validUntil");
    const metadata = String(body.get("metadata") ?? "").trim();
    const latitude = String(body.get("latitude") ?? "");
    const longitude = String(body.get("longitude") ?? "");
    body.delete("metadata");
    body.delete("latitude");
    body.delete("longitude");
    if (evidenceType === "GEO_LOCATION") {
      body.set("metadataJson", JSON.stringify({ latitude: Number(latitude), longitude: Number(longitude), note: metadata || undefined }));
    } else if (metadata) {
      try {
        JSON.parse(metadata);
      } catch {
        setError("Metadata phải là JSON hợp lệ.");
        return;
      }
      body.set("metadataJson", metadata);
    }
    setEvidenceBusy(true);
    try {
      await api.upload<{ evidence: Evidence }>(`/assets/${id}/evidence`, body);
      form.reset();
      setEvidenceType("PHOTO");
      await client.invalidateQueries({ queryKey: ["asset", id] });
      notify("Đã thêm bằng chứng", { description: "Hash SHA-256 đã được tạo và hồ sơ đã được cập nhật." });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải bằng chứng");
    } finally {
      setEvidenceBusy(false);
    }
  };

  const transition = async () => {
    try {
      setError("");
      setLifecycleBusy(true);
      await api.post(`/assets/${id}/lifecycle`, {
        stageTo,
        eventType: "OPERATOR_TRANSITION",
        evidenceIds: data?.asset.evidence?.map((evidence) => evidence.id) ?? [],
      });
      await client.invalidateQueries({ queryKey: ["asset", id] });
      notify("Đã ghi sự kiện vòng đời");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chuyển trạng thái thất bại");
    } finally {
      setLifecycleBusy(false);
    }
  };

  const generatePassport = async () => {
    setPassportBusy(true);
    try {
      setError("");
      if (!wallet.address) throw new Error("Kết nối Phantom để ký phiên bản hộ chiếu.");
      await api.patch("/me/wallet", { solanaWallet: wallet.address });
      const payload = await api.post<{ passportHash: string }>(`/assets/${id}/passport/payload`);
      const txSignature = await wallet.anchorHash("PASSPORT_ROOT", payload.passportHash);
      await api.post(`/assets/${id}/passport/generate`, {
        passportHash: payload.passportHash,
        txSignature,
        signer: wallet.address,
      });
      await client.invalidateQueries({ queryKey: ["asset", id] });
      setConfirmPassport(false);
      notify("Đã tạo phiên bản hộ chiếu", { description: "Hash hộ chiếu và chữ ký Solana đã được ghi nhận." });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Không thể tạo hộ chiếu";
      setError(message);
      notify("Không thể tạo hộ chiếu", { description: message, tone: "error" });
    } finally {
      setPassportBusy(false);
    }
  };

  const copyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    notify("Đã sao chép hash");
  };

  if (isLoading) return <LoadingSkeleton cards={4} label="Đang tải hồ sơ tài sản" />;
  if (loadError || !data) return <ErrorState description="Không thể tải hồ sơ tài sản này. Hãy kiểm tra kết nối và thử lại." />;
  const asset = data.asset;

  return (
    <div className="page-stack">
      <nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/operator">Tổng quan</Link><span aria-hidden="true">/</span><span>{asset.assetCode}</span></nav>
      <div className="asset-identity-header">
        <AssetThumbnail src={asset.photoUrl} alt={asset.displayName} size={82} />
        <PageHeader eyebrow={asset.assetCode} title={asset.displayName} description={`${asset.region} · ${stageLabels[asset.currentStage]}`} actions={<><SolanaWalletButton /><Link className="button secondary" to={`/passport/${asset.assetCode}`}>Xem hộ chiếu</Link></>} />
      </div>
      <div className="trust-strip">
        <div><span>Điểm tin cậy hồ sơ</span><strong>{asset.trustProfile?.totalScore ?? 0}<small>/100</small></strong></div>
        {(["identityScore", "evidenceScore", "verificationScore", "freshnessScore", "consistencyScore"] as const).map((key) => (
          <div key={key}><span>{{ identityScore: "Định danh", evidenceScore: "Bằng chứng", verificationScore: "Xác minh", freshnessScore: "Độ mới", consistencyScore: "Nhất quán" }[key]}</span><b>{asset.trustProfile?.[key] ?? 0}</b></div>
        ))}
        <button type="button" onClick={() => recalculate.mutate()} title="Tính lại điểm tin cậy" aria-label="Tính lại điểm tin cậy" disabled={recalculate.isPending}><RefreshCw size={18} /></button>
      </div>
      <TabNav value={tab} onChange={setTab} label="Không gian hồ sơ tài sản" items={[
        { value: "overview", label: "Tổng quan tài sản", icon: LayoutDashboard },
        { value: "evidence", label: "Kho bằng chứng", icon: FileCheck2 },
        { value: "requests", label: "Yêu cầu xác minh", icon: ClipboardCheck },
        { value: "lifecycle", label: "Vòng đời", icon: History },
        { value: "biological", label: "Sinh học", icon: Sprout },
        { value: "rights", label: "Quyền & lưu ký", icon: ShieldCheck },
        { value: "commerce", label: "Giao dịch", icon: ClipboardCheck },
        { value: "readiness", label: "Risk & Readiness", icon: AlertTriangle },
        { value: "warnings", label: "Cảnh báo", icon: AlertTriangle },
        { value: "passport", label: "Hộ chiếu & blockchain", icon: ShieldCheck },
      ]} />

      {tab === "overview" ? <div className="two-columns">
        <section className="panel"><SectionHeader title="Định danh tài sản" description="Thông tin nền của hồ sơ đang được quản lý." /><dl className="detail-list"><dt>Mã tài sản</dt><dd>{asset.assetCode}</dd><dt>Loại tài sản</dt><dd>{asset.assetType}</dd><dt>Loài / giống</dt><dd>{asset.species}</dd><dt>Khu vực</dt><dd>{asset.region}</dd><dt>Ngày tạo lập</dt><dd>{new Date(asset.plantedAt).toLocaleDateString("vi-VN")}</dd><dt>Chủ thể quản lý</dt><dd>{asset.organization?.name ?? "Chưa gán"}</dd></dl></section>
        <section className="panel"><SectionHeader title="Tình trạng hồ sơ" description="Các số liệu được tính từ dữ liệu thật hiện có." /><dl className="detail-list"><dt>Bằng chứng</dt><dd>{asset.evidence?.length ?? 0}</dd><dt>Yêu cầu xác minh</dt><dd>{asset.verificationRequests?.length ?? 0}</dd><dt>Attestation</dt><dd>{asset.attestations?.length ?? 0}</dd><dt>Sự kiện vòng đời</dt><dd>{asset.lifecycleEvents?.length ?? 0}</dd><dt>Cảnh báo</dt><dd>{asset.trustProfile?.warningCount ?? 0}</dd><dt>Định giá</dt><dd>{asset.valuations?.some((item) => item.verificationStatus === "APPROVED") ? "Có định giá bên thứ ba đã xác minh" : "Chưa có định giá được xác minh"}</dd></dl></section>
      </div> : null}

      {tab === "evidence" ? <div className="two-columns">
        <section className="panel">
          <SectionHeader title="Kho bằng chứng" description="Hash SHA-256 được tạo ở server; tải lên không đồng nghĩa đã xác minh." />
          {asset.evidence?.length ? <div className="evidence-list">{asset.evidence.map((item) => <article key={item.id}>
            <div><strong>{item.title}</strong><span>{item.type} · {item.source}</span></div><StatusPill value={item.verificationStatus} />
            <dl><dt>Quan sát</dt><dd>{new Date(item.observedAt).toLocaleDateString("vi-VN")}</dd><dt>Hash</dt><dd><code>{item.contentHash.slice(0, 16)}…</code></dd><dt>Quyền xem</dt><dd>{item.visibility}</dd></dl>
            <div className="evidence-actions"><a className="text-link" href={`${config.apiBaseUrl}/evidence/${item.id}/file`} target="_blank" rel="noreferrer"><Eye size={14} /> Xem tệp</a><button className="text-link" type="button" onClick={() => void copyHash(item.contentHash)}><Copy size={14} /> Sao chép hash</button>{item.attestations?.map((attestation) => attestation.txSignature ? <a key={attestation.id} href={getSolanaExplorerUrl(attestation.txSignature)} target="_blank" rel="noreferrer">On-chain <ExternalLink size={14} /></a> : null)}</div>
            {item.verificationStatus === "PENDING" ? <p className="field-help">Hệ thống đã tự tạo yêu cầu xác minh theo policy.</p> : <p className="field-help">Không cần verifier hoặc đã có quyết định.</p>}
          </article>)}</div> : <EmptyState title="Chưa có bằng chứng" description="Thêm ảnh, tài liệu, dữ liệu IoT hoặc nhật ký để làm đầy hồ sơ." />}
        </section>
        <form className="panel compact-form" onSubmit={submitEvidence}>
          <SectionHeader title="Thêm bằng chứng" description="Tệp sẽ được băm SHA-256 sau khi tải lên." icon={FilePlus2} />
          <label>Loại<select name="type" value={evidenceType} onChange={(event) => setEvidenceType(event.target.value as EvidenceType)}><option>PHOTO</option><option>PHOTO_CARE</option><option>GEO_LOCATION</option><option>IOT_READING</option><option>FARM_LOG</option><option>CARE_NOTE</option><option>ENVIRONMENT_READING</option><option>CERTIFICATE</option><option>INSPECTION</option><option>LAB_RESULT</option><option>PROPAGATION_SOURCE</option><option>AGE_DOCUMENT</option><option>RIGHTS_DOCUMENT</option><option>CUSTODY_DOCUMENT</option><option>CARE_AGREEMENT</option><option>HARVEST_RECORD</option><option>TRANSACTION_DOCUMENT</option><option>OTHER</option></select></label>
          <label>Tiêu đề<input name="title" required /></label>
          <label>Nguồn<input name="source" placeholder="Cán bộ hiện trường / thiết bị" required /></label>
          <label>Kiểu nguồn<select name="sourceType" defaultValue="OPERATOR"><option>OPERATOR</option><option>DEVICE</option><option>THIRD_PARTY</option><option>DOCUMENT</option><option>SYSTEM</option></select></label>
          <label>Thời điểm quan sát<input name="observedAt" type="datetime-local" required /></label>
          <label>Quyền xem<select name="visibility" defaultValue="PRIVATE"><option>PRIVATE</option><option>PARTNER</option><option>PUBLIC</option></select></label>
          <label>Mô tả<textarea name="description" rows={3} maxLength={3000} /></label>
          {evidenceType === "CERTIFICATE" ? <div className="form-grid"><label>Hiệu lực từ<input name="validFrom" type="date" /></label><label>Hiệu lực đến<input name="validUntil" type="date" required /></label></div> : null}
          {evidenceType === "GEO_LOCATION" ? <div className="form-grid"><label>Vĩ độ<input name="latitude" type="number" min="-90" max="90" step="any" required /></label><label>Kinh độ<input name="longitude" type="number" min="-180" max="180" step="any" required /></label></div> : null}
          <label>{evidenceType === "GEO_LOCATION" ? "Ghi chú vị trí" : "Metadata JSON (không bắt buộc)"}<textarea name="metadata" rows={2} placeholder={evidenceType === "GEO_LOCATION" ? "Mốc địa hình hoặc phương pháp đo…" : "{\"deviceId\":\"...\"}"} /></label>
          <label>Tệp<input name="file" type="file" accept="image/*,.pdf,application/json,text/plain" required /></label>
          <button className="button primary" disabled={evidenceBusy}>{evidenceBusy ? "Đang tải lên và tạo hash…" : "Tải lên và tạo hash"}</button>
        </form>
      </div> : null}

      {tab === "requests" ? <section className="panel"><SectionHeader title="Yêu cầu xác minh" description="Theo dõi phạm vi và trạng thái của các yêu cầu đã gửi." />{asset.verificationRequests?.length ? <div className="passport-records">{asset.verificationRequests.map((request) => { const evidence = asset.evidence?.find((item) => item.id === request.evidenceId); return <article key={request.id}><div><strong>{evidence?.title ?? "Bằng chứng"}</strong><span>{request.requestedScope} · {new Date(request.createdAt).toLocaleString("vi-VN")}</span></div><StatusPill value={request.status} />{request.requester?.fullName ? <small>Người gửi: {request.requester.fullName}</small> : null}</article>; })}</div> : <EmptyState title="Chưa có yêu cầu xác minh" description="Gửi yêu cầu từ một bằng chứng đang chờ để bắt đầu quy trình." action={<button className="button secondary" type="button" onClick={() => setTab("evidence")}>Mở kho bằng chứng</button>} />}</section> : null}

      {tab === "lifecycle" ? <div className="two-columns"><section className="panel"><SectionHeader title="Lịch sử vòng đời sinh học" description="Giao dịch quyền không làm thay đổi vòng đời sinh học." />{asset.lifecycleEvents?.length ? <ol className="timeline">{asset.lifecycleEvents.map((event) => <li key={event.id}><time>{new Date(event.occurredAt).toLocaleDateString("vi-VN")}</time><div><strong>{stageLabels[event.stageTo]}</strong><p>{event.eventType}</p></div></li>)}</ol> : <EmptyState title="Chưa có sự kiện vòng đời" description="Sự kiện mới sẽ xuất hiện sau khi transition hợp lệ được ghi nhận." />}</section><section className="panel compact-form"><SectionHeader title="Ghi sự kiện vòng đời" description="Transition sai logic hoặc thiếu bằng chứng xác minh sẽ bị chặn." /><label>Chuyển sang<select value={stageTo} onChange={(event) => setStageTo(event.target.value as LifecycleStage)}><option>PLANTED_VERIFIED</option><option>GROWING</option><option>INSPECTED</option><option>MATURE</option><option>HARVEST_READY</option><option>HARVESTED</option><option>ARCHIVED</option></select></label><button className="button secondary" type="button" disabled={lifecycleBusy} onClick={() => void transition()}>{lifecycleBusy ? "Đang ghi…" : "Ghi sự kiện"}</button></section></div> : null}

      {tab === "warnings" ? <section className="panel"><SectionHeader title="Cảnh báo dữ liệu" description="Cảnh báo được suy ra từ hồ sơ hiện tại; không phải đánh giá tài chính." />{asset.trustProfile?.warnings.length ? <div className="risk-list">{asset.trustProfile.warnings.map((warning) => <article className={`warning warning-${warning.severity.toLowerCase()}`} key={warning.code}><AlertTriangle /><div><strong>{warning.message}</strong><span>{warning.code} · Mức {warning.severity}</span></div></article>)}</div> : <EmptyState title="Không có cảnh báo đang mở" description="Tiếp tục cập nhật bằng chứng để duy trì độ mới và tính nhất quán của hồ sơ." />}</section> : null}

      {tab === "passport" ? <section className="panel"><SectionHeader title="Hộ chiếu & bản ghi toàn vẹn" description="Tạo phiên bản mới từ trạng thái hồ sơ hiện tại và ký hash bằng ví Phantom." action={<SolanaWalletButton />} /><div className="inline-note"><ShieldCheck size={19} /><span>Blockchain chỉ bảo vệ hash, chữ ký và lịch sử trạng thái; không xác nhận tài sản ngoài đời hoặc quyền sở hữu pháp lý.</span></div><div className="card-actions"><button className="button primary" type="button" onClick={() => setConfirmPassport(true)}>Tạo phiên bản hộ chiếu</button><Link className="button secondary" to={`/passport/${asset.assetCode}`}>Xem hộ chiếu công khai</Link></div></section> : null}
      {(["biological", "rights", "commerce", "readiness"] as ProductTab[]).includes(tab as ProductTab) ? <AssetProductSections asset={asset} tab={tab as ProductTab} /> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <ConfirmDialog open={confirmPassport} title="Tạo phiên bản hộ chiếu mới?" description="GreenTrace sẽ tạo hash từ hồ sơ hiện tại và yêu cầu ví Phantom ký giao dịch Solana. Hành động này không thể sửa lịch sử phiên bản đã ghi." confirmLabel="Tiếp tục ký" busy={passportBusy} onCancel={() => setConfirmPassport(false)} onConfirm={() => void generatePassport()} />
    </div>
  );
}
