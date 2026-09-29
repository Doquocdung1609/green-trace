import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, FileCheck2, PackageCheck, ShieldCheck, Sprout } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { StatusPill } from "../../components/StatusPill";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useToast } from "../../hooks/useToast";
import { config } from "../../lib/config";
import { api } from "../../services/apiClient";
import type { Asset, AssetTransaction } from "../../types/domain";

type BuyerTransaction = Omit<AssetTransaction, "asset">;

export function BuyerAssetDetail() {
  const { id = "" } = useParams();
  const { notify } = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-asset", id],
    queryFn: () => api.get<{ asset: Asset; transaction: BuyerTransaction }>(`/my-assets/${id}`),
  });
  const fulfillment = useMutation({
    mutationFn: () => api.post(`/assets/${id}/fulfillment`, { type: "HARVEST", notes: "Đề nghị phối hợp lịch thu hoạch và bàn giao." }),
    onSuccess: () => notify("Đã gửi yêu cầu thu hoạch"),
    onError: (reason) => notify("Chưa thể gửi yêu cầu", { tone: "error", description: reason instanceof Error ? reason.message : "Vui lòng thử lại." }),
  });
  if (isLoading) return <LoadingSkeleton cards={5} label="Đang tải hồ sơ tài sản của bạn" />;
  if (error || !data) return <EmptyState title="Không thể mở hồ sơ tài sản" description="Tài sản không thuộc giao dịch của tài khoản này hoặc API đang gián đoạn." action={<Link className="button secondary" to="/my-assets">Quay lại tài sản của tôi</Link>} />;
  const { asset, transaction } = data;
  const verifiedEvidence = asset.evidence?.filter((item) => item.verificationStatus === "APPROVED") ?? [];
  const openIncidents = asset.incidents?.filter((item) => item.status !== "RESOLVED") ?? [];
  const latestMeasurements = [...(asset.measurements ?? [])].sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime()).slice(0, 4);
  const custody = asset.custodyRecords?.find((item) => item.status === "ACTIVE");
  const care = asset.careAgreements?.find((item) => item.status === "ACTIVE");

  return <div className="page-stack">
    <nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/my-assets">Tài sản của tôi</Link><span aria-hidden="true">/</span><span>{asset.assetCode}</span></nav>
    <PageHeader eyebrow="Hồ sơ riêng của người mua" title={asset.displayName} description="Theo dõi tài sản thật sau giao dịch; vòng đời sinh học, lưu ký và chăm sóc được trình bày độc lập." actions={<><Link className="button secondary" to={`/passport/${asset.assetCode}`}>Hộ chiếu công khai</Link>{transaction.status === "COMPLETED" ? <button className="button primary" type="button" disabled={fulfillment.isPending} onClick={() => fulfillment.mutate()}><PackageCheck size={17} /> Yêu cầu thu hoạch</button> : null}</>} />
    <div className="stats-grid four"><div className="stat-card"><ShieldCheck /><span>Điểm tin cậy hồ sơ</span><strong>{asset.trustProfile?.totalScore ?? 0}/100</strong></div><div className="stat-card"><Activity /><span>Hồ sơ rủi ro</span><strong>{asset.riskProfile?.overallRisk ?? "—"}</strong></div><div className="stat-card"><Sprout /><span>Vòng đời sinh học</span><strong>{asset.currentStage}</strong></div><div className="stat-card"><PackageCheck /><span>Giao dịch</span><strong>{asset.transactionStage}</strong></div></div>
    <div className="two-columns">
      <section className="panel"><SectionHeader title="Định danh & giao dịch" description="Giá là điều khoản giao dịch, không phải định giá tự động từ chỉ số sinh học." />
        <dl className="detail-list"><dt>Mã tài sản</dt><dd>{asset.assetCode}</dd><dt>Loài</dt><dd>{asset.species}</dd><dt>Cấp tài sản</dt><dd>{asset.assetLevel}</dd><dt>Khu vực</dt><dd>{asset.region}</dd><dt>Giá giao dịch</dt><dd>{new Intl.NumberFormat("vi-VN", { style: "currency", currency: transaction.currency }).format(transaction.price)}</dd><dt>Lưu ký sau bán</dt><dd>{transaction.custodyAfterSale}</dd></dl>
      </section>
      <section className="panel"><SectionHeader title="Quyền, lưu ký & chăm sóc" description="Giao dịch quyền không mặc nhiên di chuyển tài sản vật lý." />
        <dl className="detail-list"><dt>Khai báo quyền</dt><dd>{asset.rightsRecords?.[0]?.holder ?? "Chưa có"} · {asset.rightsRecords?.[0]?.verifiedStatus ?? "PENDING"}</dd><dt>Đơn vị lưu ký</dt><dd>{custody?.physicalCustodian ?? "Chưa xác định"}</dd><dt>Địa điểm lưu ký</dt><dd>{custody?.location ?? "Chưa xác định"}</dd><dt>Chăm sóc</dt><dd>{care ? `${care.careFrequency} · ${care.responsibility}` : "Chưa có thỏa thuận"}</dd></dl>
      </section>
    </div>
    <div className="two-columns">
      <section className="panel"><SectionHeader title="Bằng chứng đã xác minh" description="Chỉ hiển thị tài liệu PUBLIC/PARTNER mà tài khoản được phép truy cập." icon={FileCheck2} />
        {verifiedEvidence.length ? <div className="passport-records">{verifiedEvidence.map((item) => <article key={item.id}><div><strong>{item.title}</strong><span>{item.type} · {new Date(item.observedAt).toLocaleDateString("vi-VN")}</span></div><StatusPill value={item.verificationStatus} /><a className="text-link" href={`${config.apiBaseUrl}/evidence/${item.id}/file`} target="_blank" rel="noreferrer">Xem tài liệu</a></article>)}</div> : <EmptyState title="Chưa có bằng chứng đã xác minh được chia sẻ" description="Tài liệu PRIVATE vẫn được bảo vệ theo quyền truy cập." />}
      </section>
      <section className="panel"><SectionHeader title="Sinh học & sự cố" description="Các chỉ số không được quy đổi tự động thành giá trị tài sản." icon={Activity} />
        {latestMeasurements.length ? <div className="passport-records">{latestMeasurements.map((item) => <article key={item.id}><div><strong>{item.measurementType}</strong><span>{new Date(item.observedAt).toLocaleDateString("vi-VN")}</span></div><b>{item.value} {item.unit}</b></article>)}</div> : <p className="inline-note">Chưa có đo lường sinh học.</p>}
        <h3>Sự cố đang mở</h3>{openIncidents.length ? <div className="risk-list">{openIncidents.map((item) => <article className={`warning warning-${item.severity.toLowerCase()}`} key={item.id}><div><strong>{item.type} · {item.severity}</strong><span>{item.status}</span></div></article>)}</div> : <p className="inline-note">Không có sự cố đang mở.</p>}
      </section>
    </div>
    <section className="panel"><SectionHeader title="Sẵn sàng theo mục đích" description="Readiness không phải điểm tín dụng hoặc cam kết được đối tác tài chính chấp thuận." />{asset.readinessProfiles?.map((profile) => <article className="readiness-card" key={profile.purpose}><div><strong>{profile.purpose === "REAL_ASSET_TRANSFER" ? "Chuyển giao tài sản thật" : "Rà soát tài chính"}</strong><StatusPill value={profile.status} /></div><ul>{profile.requirements.map((item) => <li key={item.key}>{item.met ? "✓" : "○"} {item.label}</li>)}</ul></article>)}</section>
  </div>;
}
