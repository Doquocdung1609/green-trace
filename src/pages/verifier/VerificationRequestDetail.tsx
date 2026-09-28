import { ExternalLink, FileText, Hash, MapPin, UserRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SolanaWalletButton } from "../../components/SolanaWalletButton";
import { api } from "../../services/apiClient";
import { getSolanaExplorerUrl } from "../../solana/explorer";
import { useSolanaWallet } from "../../solana/useSolanaWallet";
import type {
  VerificationRequest,
  VerificationScope,
} from "../../types/domain";

export function VerificationRequestDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const wallet = useSolanaWallet();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signature, setSignature] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["verification-request", id],
    queryFn: () =>
      api.get<{ request: VerificationRequest }>(`/verification-requests/${id}`),
  });
  if (isLoading || !data)
    return <div className="page-state">Đang tải bằng chứng…</div>;
  const request = data.request;
  const evidence = request.evidence;
  const decide = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const decision = submitter?.value === "reject" ? "reject" : "approve";
    if (!evidence) return;
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const scope = form.get("scope") as VerificationScope;
    const note = String(form.get("note"));
    try {
      let txSignature: string | undefined;
      let payloadHash: string | undefined;
      if (decision === "approve") {
        if (!wallet.address)
          throw new Error("Kết nối Phantom để ký attestation.");
        await api.patch("/me/wallet", { solanaWallet: wallet.address });
        const canonical = await api.post<{ payloadHash: string }>(
          `/verification-requests/${id}/payload`,
          { scope, note, verifierWallet: wallet.address },
        );
        payloadHash = canonical.payloadHash;
        txSignature = await wallet.anchorHash("ATTESTATION", payloadHash);
        setSignature(txSignature);
      }
      await api.post(`/verification-requests/${id}/${decision}`, {
        scope,
        note,
        verifierWallet: wallet.address,
        txSignature,
        payloadHash,
      });
      await client.invalidateQueries({ queryKey: ["verification-requests"] });
      navigate("/verifier/requests");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể hoàn tất xác minh",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Yêu cầu xác minh</p>
          <h1>{request.asset?.displayName}</h1>
          <p>
            {request.asset?.assetCode} · {request.requestedScope}
          </p>
        </div>
        <SolanaWalletButton />
      </div>
      <div className="verification-layout">
        <section className="panel evidence-preview">
          <div className="preview-placeholder">
            <FileText size={42} />
            <strong>{evidence?.title}</strong>
            <span>{evidence?.mimeType}</span>
            {evidence?.visibility !== "PRIVATE" && (
              <a href={evidence?.storageUri} target="_blank" rel="noreferrer">
                Mở tệp <ExternalLink size={14} />
              </a>
            )}
          </div>
          <dl className="detail-list">
            <dt>
              <UserRound />
              Người gửi
            </dt>
            <dd>{request.requester?.fullName}</dd>
            <dt>
              <MapPin />
              Nguồn
            </dt>
            <dd>{evidence?.source}</dd>
            <dt>
              <Hash />
              SHA-256
            </dt>
            <dd>
              <code>{evidence?.contentHash}</code>
            </dd>
            <dt>Quan sát lúc</dt>
            <dd>
              {evidence &&
                new Date(evidence.observedAt).toLocaleString("vi-VN")}
            </dd>
          </dl>
        </section>
        <form
          className="panel decision-card"
          onSubmit={(e) => void decide(e)}
        >
          <h2>Quyết định</h2>
          <p>
            Chữ ký chỉ xác nhận đúng phạm vi dưới đây. Nó không chứng minh chất
            lượng hoặc quyền sở hữu ngoài phạm vi đó.
          </p>
          <label>
            Phạm vi xác minh
            <select name="scope" defaultValue={request.requestedScope}>
              <option>EXISTENCE</option>
              <option>LOCATION</option>
              <option>AGE_OR_LIFECYCLE</option>
              <option>CERTIFICATE_VALIDITY</option>
              <option>LAB_RESULT</option>
              <option>IOT_SOURCE</option>
              <option>OTHER</option>
            </select>
          </label>
          <label>
            Ghi chú bắt buộc
            <textarea
              name="note"
              rows={6}
              required
              placeholder="Mô tả điều đã kiểm tra và giới hạn kết luận…"
            />
          </label>
          {signature && (
            <a
              href={getSolanaExplorerUrl(signature)}
              target="_blank"
              rel="noreferrer"
            >
              Xem giao dịch vừa ký <ExternalLink size={14} />
            </a>
          )}
          {error && <p className="form-error">{error}</p>}
          <div className="decision-actions">
            <button
              type="submit"
              name="decision"
              value="reject"
              className="button danger"
              disabled={busy}
            >
              Từ chối
            </button>
            <button
              className="button primary"
              name="decision"
              value="approve"
              disabled={busy}
            >
              {busy ? "Đang ký và xác nhận…" : "Duyệt và ký trên Solana"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
