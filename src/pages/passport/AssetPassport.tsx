import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  History,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { StatusPill } from "../../components/StatusPill";
import { api } from "../../services/apiClient";
import { getSolanaExplorerUrl } from "../../solana/explorer";
import { stageLabels, type Asset } from "../../types/domain";

const tabs = [
  "Tổng quan",
  "Bằng chứng",
  "Xác minh",
  "Vòng đời",
  "Rủi ro dữ liệu",
  "Lịch sử blockchain",
] as const;
type Tab = (typeof tabs)[number];

export function AssetPassport() {
  const { assetCode = "" } = useParams();
  const [tab, setTab] = useState<Tab>("Tổng quan");
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-passport", assetCode],
    queryFn: () => api.get<{ asset: Asset }>(`/public/passports/${assetCode}`),
  });
  if (isLoading)
    return <div className="page-state">Đang kiểm tra hộ chiếu…</div>;
  if (error || !data)
    return (
      <div className="page-state error">
        <h1>Không tìm thấy hộ chiếu</h1>
        <Link to="/">Về trang chủ</Link>
      </div>
    );
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
        <section className="passport-header">
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
            <small>Điểm tin cậy hồ sơ</small>
          </div>
        </section>
        <section className="passport-metrics">
          <div>
            <Fingerprint />
            <span>Định danh</span>
            <strong>{trust?.identityScore ?? 0}/20</strong>
          </div>
          <div>
            <FileCheck2 />
            <span>Bằng chứng</span>
            <strong>{trust?.evidenceScore ?? 0}/20</strong>
          </div>
          <div>
            <BadgeCheck />
            <span>Xác minh</span>
            <strong>{trust?.verificationScore ?? 0}/30</strong>
          </div>
          <div>
            <History />
            <span>Độ mới</span>
            <strong>{trust?.freshnessScore ?? 0}/15</strong>
          </div>
          <div>
            <ShieldCheck />
            <span>Nhất quán</span>
            <strong>{trust?.consistencyScore ?? 0}/15</strong>
          </div>
        </section>
        <nav className="passport-tabs">
          {tabs.map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </nav>
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
                  Passport hash{" "}
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
            <ol className="timeline">
              {asset.lifecycleEvents?.map((event) => (
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
            </ol>
          )}
          {tab === "Rủi ro dữ liệu" && (
            <div className="risk-list">
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
          {tab === "Lịch sử blockchain" && (
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
          <ShieldCheck />
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
