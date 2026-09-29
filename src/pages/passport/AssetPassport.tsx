import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Box,
  Copy,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  History,
  MapPin,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { StatusPill } from "../../components/StatusPill";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { TabNav, type TabItem } from "../../components/ui/TabNav";
import { api } from "../../services/apiClient";
import { getSolanaExplorerUrl } from "../../solana/explorer";
import { stageLabels, type Asset } from "../../types/domain";

type Tab = "Tổng quan" | "Sinh học" | "Bằng chứng" | "Xác minh" | "Quyền & lưu ký" | "Vòng đời" | "Giao dịch" | "Risk" | "Readiness" | "Blockchain";
const tabItems: TabItem<Tab>[] = [
  { value: "Tổng quan", label: "Tổng quan", icon: Fingerprint },
  { value: "Sinh học", label: "Sinh học", icon: History },
  { value: "Bằng chứng", label: "Bằng chứng", icon: FileCheck2 },
  { value: "Xác minh", label: "Xác minh", icon: BadgeCheck },
  { value: "Quyền & lưu ký", label: "Quyền & lưu ký", icon: ShieldCheck },
  { value: "Vòng đời", label: "Vòng đời", icon: History },
  { value: "Giao dịch", label: "Giao dịch", icon: ScrollText },
  { value: "Risk", label: "Risk", icon: AlertTriangle },
  { value: "Readiness", label: "Readiness", icon: ShieldCheck },
  { value: "Blockchain", label: "Blockchain", icon: Box },
];

export function AssetPassport() {
  const { assetCode = "" } = useParams();
  const [tab, setTab] = useState<Tab>("Tổng quan");
  const [copiedHash, setCopiedHash] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-passport", assetCode],
    queryFn: () => api.get<{ asset: Asset }>(`/public/passports/${assetCode}`),
  });
  if (isLoading) return <main className="passport-container"><LoadingSkeleton cards={5} label="Đang kiểm tra hộ chiếu" /></main>;
  if (error || !data)
    return <div className="page-state"><ErrorState title="Không tìm thấy hộ chiếu" description="Mã tài sản không tồn tại hoặc hộ chiếu chưa được công khai." action={<Link className="button primary" to="/">Về trang chủ</Link>} /></div>;
  const asset = data.asset;
  const trust = asset.trustProfile;
  const latest = asset.passports?.[0];
  return (
    <div className="passport-page">
      <header className="passport-nav">
        <Link to="/" className="brand">
          <span>GT</span> GreenTrace
        </Link>
        <Link to="/login" className="button secondary">
          Đăng nhập hệ thống
        </Link>
      </header>
      <main className="passport-container">
        <Link className="back-link" to="/">
          <ArrowLeft size={16} />
          Trang chủ
        </Link>
        <section className="passport-header" style={{ backgroundImage: `linear-gradient(100deg,rgba(3,75,55,.98) 0 58%,rgba(3,75,55,.15)),url("${asset.photoUrl || "/assets/demo/ginseng-field.svg"}")` }}>
          <div>
            <p className="eyebrow">
              Hộ chiếu tài sản số · Phiên bản {latest?.version ?? 1}
            </p>
            <h1>{asset.displayName}</h1>
            <p>
              <code>{asset.assetCode}</code> · {asset.region}
            </p>
            <StatusPill value={asset.passportStatus} />
          </div>
          <div className="passport-score">
            <strong>{trust?.totalScore ?? 0}</strong>
            <span>/100</span>
            <small><span>Điểm tin cậy hồ sơ</span> · {trust && trust.totalScore >= 80 ? "Độ tin cậy cao" : "Cần xem xét"}</small>
          </div>
        </section>
        <section className="passport-metrics">
          <div>
            <Fingerprint />
            <span>Định danh</span>
            <strong>{trust?.identityScore ?? 0}/20</strong>
            <ProgressBar value={trust?.identityScore ?? 0} max={20} label="Điểm định danh" />
          </div>
          <div>
            <FileCheck2 />
            <span>Bằng chứng</span>
            <strong>{trust?.evidenceScore ?? 0}/20</strong>
            <ProgressBar value={trust?.evidenceScore ?? 0} max={20} label="Điểm bằng chứng" />
          </div>
          <div>
            <BadgeCheck />
            <span>Xác minh</span>
            <strong>{trust?.verificationScore ?? 0}/30</strong>
            <ProgressBar value={trust?.verificationScore ?? 0} max={30} label="Điểm xác minh" />
          </div>
          <div>
            <History />
            <span>Độ mới</span>
            <strong>{trust?.freshnessScore ?? 0}/15</strong>
            <ProgressBar value={trust?.freshnessScore ?? 0} max={15} label="Điểm độ mới" />
          </div>
          <div>
            <ShieldCheck />
            <span>Nhất quán</span>
            <strong>{trust?.consistencyScore ?? 0}/15</strong>
            <ProgressBar value={trust?.consistencyScore ?? 0} max={15} label="Điểm nhất quán" />
          </div>
        </section>
        <TabNav items={tabItems} value={tab} onChange={setTab} label="Nội dung hộ chiếu" />
        <section className="passport-content">
          {tab === "Tổng quan" && (
            <div className="overview-grid">
              <article>
                <h2>Định danh tài sản</h2>
                <dl className="detail-list">
                  <dt>Loại tài sản</dt>
                  <dd>{asset.assetType}</dd>
                  <dt>Loài / giống</dt>
                  <dd>{asset.species}</dd>
                  <dt>Chủ thể quản lý</dt>
                  <dd>{asset.organization?.name}</dd>
                  <dt>Khu vực công khai</dt>
                  <dd>
                    <MapPin size={15} />
                    {asset.region}
                  </dd>
                  <dt>Ngày trồng</dt>
                  <dd>
                    {new Date(asset.plantedAt).toLocaleDateString("vi-VN")}
                  </dd>
                  <dt>Trạng thái</dt>
                  <dd>{stageLabels[asset.currentStage]}</dd>
                </dl>
              </article>
              <article>
                <h2>Phạm vi sử dụng</h2>
                <p>{asset.description}</p>
                <p className="hash-block">
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>Passport hash {latest?.passportHash ? <button type="button" className="text-link" onClick={() => { void navigator.clipboard.writeText(latest.passportHash); setCopiedHash(true); window.setTimeout(() => setCopiedHash(false), 1600); }} aria-label="Sao chép passport hash"><Copy size={15} /> {copiedHash ? "Đã sao chép" : "Sao chép"}</button> : null}</span>
                  <code>{latest?.passportHash ?? "Chưa tạo phiên bản"}</code>
                </p>
              </article>
            </div>
          )}
          {tab === "Bằng chứng" && (
            <div className="passport-records">
              {asset.evidence?.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.type} · {item.source}
                    </span>
                  </div>
                  <StatusPill value={item.verificationStatus} />
                  <code>{item.contentHash}</code>
                  <small>
                    Quan sát{" "}
                    {new Date(item.observedAt).toLocaleDateString("vi-VN")}
                  </small>
                </article>
              ))}
              {!asset.evidence?.length && (
                <EmptyState
                  title="Chưa có bằng chứng công khai"
                  description="Bằng chứng private và partner không được hiển thị ở đây."
                />
              )}
            </div>
          )}
          {tab === "Sinh học" && <div className="overview-grid"><article><h2>Đo lường gần đây</h2>{asset.measurements?.length ? <dl className="detail-list">{asset.measurements.map((item) => <div key={item.id}><dt>{item.measurementType}</dt><dd>{item.value} {item.unit}</dd></div>)}</dl> : <EmptyState title="Chưa có đo lường công khai" description="Hồ sơ chưa có dữ liệu quan sát được phép công khai." />}</article><article><h2>Sự cố đã công bố</h2>{asset.incidents?.length ? asset.incidents.map((item) => <p key={item.id}><StatusPill value={item.severity} /> {item.type} · {item.status}</p>) : <EmptyState title="Không có sự cố công khai" description="Không đồng nghĩa tài sản không có rủi ro sinh học." />}</article></div>}
          {tab === "Xác minh" && (
            <div className="passport-records">
              {asset.attestations?.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.scope}</strong>
                    <span>
                      {item.verifier?.fullName} ·{" "}
                      {item.verifier?.organization?.name}
                    </span>
                  </div>
                  <StatusPill value={item.decision} />
                  <p>{item.note}</p>
                  {item.txSignature && (
                    <a
                      href={getSolanaExplorerUrl(item.txSignature)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Xem chữ ký trên Solana Explorer <ExternalLink size={14} />
                    </a>
                  )}
                </article>
              ))}
              {!asset.attestations?.length && (
                <EmptyState
                  title="Chưa có xác minh công khai"
                  description="Hồ sơ chưa có attestation hợp lệ."
                />
              )}
            </div>
          )}
          {tab === "Vòng đời" && (
            asset.lifecycleEvents?.length ? <ol className="timeline">
              {asset.lifecycleEvents.map((event) => (
                <li key={event.id}>
                  <time>
                    {new Date(event.occurredAt).toLocaleDateString("vi-VN")}
                  </time>
                  <div>
                    <strong>{stageLabels[event.stageTo]}</strong>
                    <p>{event.eventType}</p>
                  </div>
                </li>
              ))}
            </ol> : <EmptyState title="Chưa có sự kiện vòng đời công khai" description="Các sự kiện hợp lệ sẽ xuất hiện tại đây khi được ghi nhận." />
          )}
          {tab === "Quyền & lưu ký" && <div className="overview-grid"><article><h2>Quyền được công bố</h2>{asset.rightsRecords?.map((item) => <p key={item.id}><strong>{item.rightType}</strong><br />{item.holder} · {item.verifiedStatus}</p>)}</article><article><h2>Lưu ký vật lý</h2>{asset.custodyRecords?.map((item) => <p key={item.id}><strong>{item.physicalCustodian}</strong><br />{item.location} · {item.status}</p>)}</article></div>}
          {tab === "Giao dịch" && <div className="inline-note"><ScrollText /><span>Trạng thái giao dịch: <strong>{asset.transactionStage}</strong>. Giá, tài liệu chuyển quyền và điều khoản thương mại không hiển thị công khai. Giao dịch không thay đổi vòng đời sinh học.</span></div>}
          {tab === "Risk" && (
            <div className="risk-list">
              {asset.riskProfile ? <article className={`warning warning-${asset.riskProfile.overallRisk === "LOW" ? "low" : "high"}`}><AlertTriangle /><div><strong>Rủi ro tổng hợp: {asset.riskProfile.overallRisk}</strong><span>Sinh học {asset.riskProfile.biologicalRisk} · Vị trí {asset.riskProfile.locationRisk} · Lưu ký {asset.riskProfile.custodyRisk}</span></div></article> : null}
              {trust?.warnings.map((warning) => (
                <article
                  key={warning.code}
                  className={`warning warning-${warning.severity.toLowerCase()}`}
                >
                  <AlertTriangle />
                  <div>
                    <strong>{warning.message}</strong>
                    <span>
                      {warning.code} · Mức {warning.severity}
                    </span>
                  </div>
                </article>
              ))}
              {!trust?.warnings.length && (
                <EmptyState
                  title="Không có cảnh báo đang mở"
                  description="Điều này không đồng nghĩa tài sản không có rủi ro sinh học hoặc tài chính."
                />
              )}
            </div>
          )}
          {tab === "Readiness" && <div className="passport-records">{asset.readinessProfiles?.map((profile) => <article key={profile.purpose}><div><strong>{profile.purpose}</strong><span>{profile.missingItems.length ? `Thiếu ${profile.missingItems.length} điều kiện` : "Đủ điều kiện cho bước review"}</span></div><StatusPill value={profile.status} /><ul>{profile.requirements.map((item) => <li key={item.key}>{item.met ? "✓" : "○"} {item.label}</li>)}</ul></article>)}</div>}
          {tab === "Blockchain" && (
            <div className="passport-records">
              {asset.blockchainTransactions?.map((tx) => (
                <article key={tx.id}>
                  <div>
                    <strong>{tx.type}</strong>
                    <span>
                      {tx.cluster} · {tx.signer.slice(0, 8)}…
                    </span>
                  </div>
                  <span className={`chain-${tx.status.toLowerCase()}`}>
                    {tx.status}
                  </span>
                  <a
                    href={getSolanaExplorerUrl(
                      tx.signature,
                      tx.cluster as "devnet",
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on Solana Explorer <ExternalLink size={14} />
                  </a>
                </article>
              ))}
              {!asset.blockchainTransactions?.length && (
                <EmptyState
                  title="Chưa có bản ghi on-chain"
                  description="Chỉ giao dịch đã xác nhận mới xuất hiện trong lịch sử này."
                />
              )}
            </div>
          )}
        </section>
        <section className="disclaimer">
          <ScrollText />
          <div>
            <strong>Giới hạn của hộ chiếu</strong>
            <p>
              GreenTrace không xác nhận quyền sở hữu pháp lý, không định giá tài
              sản, không cung cấp điểm tín dụng và không đưa ra khuyến nghị đầu
              tư. Blockchain chỉ ghi nhận ai ký, thời điểm, hash và lịch sử
              trạng thái.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
