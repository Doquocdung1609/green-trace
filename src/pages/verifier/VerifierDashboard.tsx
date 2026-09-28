import { BadgeCheck, Ban, Clock3, Hourglass } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { SolanaWalletButton } from "../../components/SolanaWalletButton";
import { StatCard } from "../../components/StatCard";
import { api } from "../../services/apiClient";
import { useSolanaWallet } from "../../solana/useSolanaWallet";
import type { Attestation, VerificationRequest } from "../../types/domain";

interface ManagedAttestation extends Attestation {
  asset: { assetCode: string; displayName: string };
  evidence: { title: string; contentHash: string };
}

export function VerifierDashboard() {
  const wallet = useSolanaWallet();
  const [actionError, setActionError] = useState("");
  const [revokingId, setRevokingId] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["verification-requests"],
    queryFn: () =>
      api.get<{ requests: VerificationRequest[] }>("/verification-requests"),
  });
  const requests = data?.requests ?? [];
  const { data: attestationData, refetch: refetchAttestations } = useQuery({
    queryKey: ["my-attestations"],
    queryFn: () => api.get<{ attestations: ManagedAttestation[] }>("/attestations/mine"),
  });
  const revoke = async (attestation: ManagedAttestation) => {
    setActionError("");
    setRevokingId(attestation.id);
    try {
      if (!wallet.address) throw new Error("Kết nối đúng ví Phantom đã ký attestation.");
      const canonical = await api.post<{ payloadHash: string }>(
        `/attestations/${attestation.id}/revoke/payload`,
        { verifierWallet: wallet.address },
      );
      const txSignature = await wallet.anchorHash(
        "ATTESTATION_REVOCATION",
        canonical.payloadHash,
      );
      await api.post(`/attestations/${attestation.id}/revoke`, {
        verifierWallet: wallet.address,
        payloadHash: canonical.payloadHash,
        txSignature,
      });
      await refetchAttestations();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Không thể thu hồi attestation");
    } finally {
      setRevokingId("");
    }
  };
  if (isLoading)
    return <div className="page-state">Đang tải trung tâm xác minh…</div>;
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Trung tâm xác minh</p>
          <h1>Công việc của bạn</h1>
          <p>
            Chỉ xác nhận phạm vi bạn có đủ thẩm quyền và bằng chứng để kết luận.
          </p>
        </div>
        <div className="heading-actions"><SolanaWalletButton /><Link className="button primary" to="/verifier/requests">Mở hàng đợi</Link></div>
      </div>
      <div className="stats-grid four">
        <StatCard
          label="Đang chờ"
          value={requests.filter((r) => r.status === "PENDING").length}
          icon={Clock3}
        />
        <StatCard
          label="Đã duyệt"
          value={requests.filter((r) => r.status === "APPROVED").length}
          icon={BadgeCheck}
        />
        <StatCard
          label="Đã từ chối"
          value={requests.filter((r) => r.status === "REJECTED").length}
          icon={Ban}
        />
        <StatCard
          label="Sắp hết hiệu lực"
          value={requests.filter((r) => r.status === "EXPIRED").length}
          icon={Hourglass}
        />
      </div>
      <section className="panel">
        <h2>Ưu tiên hôm nay</h2>
        {requests
          .filter((r) => r.status === "PENDING")
          .slice(0, 5)
          .map((request) => (
            <Link
              className="request-row"
              key={request.id}
              to={`/verifier/requests/${request.id}`}
            >
              <div>
                <strong>{request.asset?.displayName}</strong>
                <span>{request.evidence?.title}</span>
              </div>
              <span>{request.requestedScope}</span>
              <time>
                {new Date(request.createdAt).toLocaleDateString("vi-VN")}
              </time>
            </Link>
          ))}
        {!requests.some((r) => r.status === "PENDING") && (
          <EmptyState
            title="Không có yêu cầu đang chờ"
            description="Hàng đợi xác minh của bạn đang trống."
          />
        )}
      </section>
      <section className="panel">
        <div className="panel-heading"><div><h2>Attestation đã ký</h2><p>Thu hồi phải được ký bởi đúng ví ban đầu và được ghi nhận on-chain.</p></div></div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Tài sản</th><th>Bằng chứng</th><th>Phạm vi</th><th>Hiệu lực</th><th></th></tr></thead>
            <tbody>
              {(attestationData?.attestations ?? []).map((attestation) => (
                <tr key={attestation.id}>
                  <td><strong>{attestation.asset.displayName}</strong><small>{attestation.asset.assetCode}</small></td>
                  <td>{attestation.evidence.title}</td>
                  <td>{attestation.scope}</td>
                  <td>{attestation.revokedAt ? "Đã thu hồi" : attestation.expiresAt ? new Date(attestation.expiresAt).toLocaleDateString("vi-VN") : "Không giới hạn"}</td>
                  <td><button className="button danger compact" disabled={Boolean(attestation.revokedAt) || Boolean(revokingId)} onClick={() => void revoke(attestation)}>{revokingId === attestation.id ? "Đang ký…" : attestation.revokedAt ? "Đã thu hồi" : "Thu hồi"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {actionError && <p className="form-error">{actionError}</p>}
      </section>
    </div>
  );
}
