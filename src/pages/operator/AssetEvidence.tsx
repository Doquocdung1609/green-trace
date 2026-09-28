import { ExternalLink, FilePlus2, RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { SolanaWalletButton } from "../../components/SolanaWalletButton";
import { StatusPill } from "../../components/StatusPill";
import { api } from "../../services/apiClient";
import { getSolanaExplorerUrl } from "../../solana/explorer";
import { useSolanaWallet } from "../../solana/useSolanaWallet";
import type {
  Asset,
  Evidence,
  LifecycleStage,
  VerificationScope,
} from "../../types/domain";

export function AssetEvidence() {
  const { id = "" } = useParams();
  const client = useQueryClient();
  const [error, setError] = useState("");
  const wallet = useSolanaWallet();
  const { data, isLoading } = useQuery({
    queryKey: ["asset", id],
    queryFn: () => api.get<{ asset: Asset }>(`/assets/${id}`),
  });
  const recalculate = useMutation({
    mutationFn: () => api.post(`/assets/${id}/recalculate-trust`),
    onSuccess: () => client.invalidateQueries({ queryKey: ["asset", id] }),
  });
  const submitEvidence = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const body = new FormData(event.currentTarget);
    try {
      await api.upload<{ evidence: Evidence }>(`/assets/${id}/evidence`, body);
      event.currentTarget.reset();
      await client.invalidateQueries({ queryKey: ["asset", id] });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tải bằng chứng",
      );
    }
  };
  const requestVerification = async (
    evidenceId: string,
    scope: VerificationScope,
  ) => {
    await api.post(`/evidence/${evidenceId}/request-verification`, {
      requestedScope: scope,
    });
    await client.invalidateQueries({ queryKey: ["asset", id] });
  };
  const transition = async (stageTo: LifecycleStage) => {
    try {
      await api.post(`/assets/${id}/lifecycle`, {
        stageTo,
        eventType: "OPERATOR_TRANSITION",
        evidenceIds: data?.asset.evidence?.map((e) => e.id) ?? [],
      });
      await client.invalidateQueries({ queryKey: ["asset", id] });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Chuyển trạng thái thất bại",
      );
    }
  };
  const generatePassport = async () => {
    try {
      setError("");
      if (!wallet.address)
        throw new Error("Kết nối Phantom để ký phiên bản hộ chiếu.");
      await api.patch("/me/wallet", { solanaWallet: wallet.address });
      const payload = await api.post<{ passportHash: string }>(
        `/assets/${id}/passport/payload`,
      );
      const txSignature = await wallet.anchorHash(
        "PASSPORT_ROOT",
        payload.passportHash,
      );
      await api.post(`/assets/${id}/passport/generate`, {
        passportHash: payload.passportHash,
        txSignature,
        signer: wallet.address,
      });
      await client.invalidateQueries({ queryKey: ["asset", id] });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tạo hộ chiếu",
      );
    }
  };
  if (isLoading || !data)
    return <div className="page-state">Đang tải hồ sơ…</div>;
  const asset = data.asset;
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{asset.assetCode}</p>
          <h1>{asset.displayName}</h1>
          <p>
            {asset.region} · <StatusPill value={asset.currentStage} />
          </p>
        </div>
        <div className="card-actions">
          <SolanaWalletButton />
          <button
            className="button primary"
            onClick={() => void generatePassport()}
          >
            Tạo phiên bản hộ chiếu
          </button>
          <Link className="button secondary" to={`/passport/${asset.assetCode}`}>
            Xem hộ chiếu
          </Link>
        </div>
      </div>
      <div className="trust-strip">
        <div>
          <span>Điểm tin cậy hồ sơ</span>
          <strong>
            {asset.trustProfile?.totalScore ?? 0}
            <small>/100</small>
          </strong>
        </div>
        {(
          [
            "identityScore",
            "evidenceScore",
            "verificationScore",
            "freshnessScore",
            "consistencyScore",
          ] as const
        ).map((key) => (
          <div key={key}>
            <span>
              {
                {
                  identityScore: "Định danh",
                  evidenceScore: "Bằng chứng",
                  verificationScore: "Xác minh",
                  freshnessScore: "Độ mới",
                  consistencyScore: "Nhất quán",
                }[key]
              }
            </span>
            <b>{asset.trustProfile?.[key] ?? 0}</b>
          </div>
        ))}
        <button onClick={() => recalculate.mutate()} title="Tính lại">
          <RefreshCw size={18} />
        </button>
      </div>
      {asset.trustProfile?.warnings.map((warning) => (
        <p
          className={`warning warning-${warning.severity.toLowerCase()}`}
          key={warning.code}
        >
          <strong>Cần kiểm tra:</strong> {warning.message}
        </p>
      ))}
      <div className="two-columns">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Kho bằng chứng</h2>
              <p>
                Hash SHA-256 được tạo ở server; tải lên không đồng nghĩa đã xác
                minh.
              </p>
            </div>
          </div>
          {asset.evidence?.length ? (
            <div className="evidence-list">
              {asset.evidence.map((item) => (
                <article key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.type} · {item.source}
                    </span>
                  </div>
                  <StatusPill value={item.verificationStatus} />
                  <dl>
                    <dt>Quan sát</dt>
                    <dd>
                      {new Date(item.observedAt).toLocaleDateString("vi-VN")}
                    </dd>
                    <dt>Hash</dt>
                    <dd>
                      <code>{item.contentHash.slice(0, 16)}…</code>
                    </dd>
                    <dt>Quyền xem</dt>
                    <dd>{item.visibility}</dd>
                  </dl>
                  {item.attestations?.map(
                    (a) =>
                      a.txSignature && (
                        <a
                          key={a.id}
                          href={getSolanaExplorerUrl(a.txSignature)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Bằng chứng blockchain <ExternalLink size={14} />
                        </a>
                      ),
                  )}
                  {item.verificationStatus === "PENDING" && (
                    <button
                      className="text-link"
                      onClick={() =>
                        void requestVerification(
                          item.id,
                          item.type === "GEO_LOCATION"
                            ? "LOCATION"
                            : item.type === "CERTIFICATE"
                              ? "CERTIFICATE_VALIDITY"
                              : "EXISTENCE",
                        )
                      }
                    >
                      Yêu cầu xác minh
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có bằng chứng"
              description="Thêm ảnh, tài liệu, dữ liệu IoT hoặc nhật ký để làm đầy hồ sơ."
            />
          )}
        </section>
        <aside className="page-stack">
          <form className="panel compact-form" onSubmit={submitEvidence}>
            <h2>
              <FilePlus2 size={19} /> Thêm bằng chứng
            </h2>
            <label>
              Loại
              <select name="type" defaultValue="PHOTO">
                <option>PHOTO</option>
                <option>GEO_LOCATION</option>
                <option>IOT_READING</option>
                <option>FARM_LOG</option>
                <option>CERTIFICATE</option>
                <option>INSPECTION</option>
                <option>LAB_RESULT</option>
                <option>OTHER</option>
              </select>
            </label>
            <label>
              Tiêu đề
              <input name="title" required />
            </label>
            <label>
              Nguồn
              <input
                name="source"
                placeholder="Cán bộ hiện trường / thiết bị"
                required
              />
            </label>
            <label>
              Thời điểm quan sát
              <input name="observedAt" type="datetime-local" required />
            </label>
            <label>
              Quyền xem
              <select name="visibility" defaultValue="PRIVATE">
                <option>PRIVATE</option>
                <option>PARTNER</option>
                <option>PUBLIC</option>
              </select>
            </label>
            <label>
              Mô tả
              <textarea name="description" rows={3} />
            </label>
            <label>
              Tệp
              <input
                name="file"
                type="file"
                accept="image/*,.pdf,application/json,text/plain"
                required
              />
            </label>
            <button className="button primary">Tải lên và tạo hash</button>
          </form>
          <section className="panel compact-form">
            <h2>Sổ vòng đời</h2>
            <p>
              Transition sai logic hoặc thiếu bằng chứng xác minh sẽ bị chặn.
            </p>
            <label>
              Chuyển sang
              <select id="stageTo" defaultValue="PLANTED_VERIFIED">
                <option>PLANTED_VERIFIED</option>
                <option>GROWING</option>
                <option>INSPECTED</option>
                <option>MATURE</option>
                <option>HARVEST_READY</option>
                <option>HARVESTED</option>
                <option>TRANSFERRED</option>
                <option>ARCHIVED</option>
              </select>
            </label>
            <button
              className="button secondary"
              onClick={() =>
                void transition(
                  (document.getElementById("stageTo") as HTMLSelectElement)
                    .value as LifecycleStage,
                )
              }
            >
              Ghi sự kiện
            </button>
          </section>
        </aside>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
