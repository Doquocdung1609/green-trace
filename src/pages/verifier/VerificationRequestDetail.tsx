import { CheckCircle2, Copy, ExternalLink, FileText, Hash, MapPin, UserRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SolanaWalletButton } from "../../components/SolanaWalletButton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useToast } from "../../hooks/useToast";
import { config } from "../../lib/config";
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
  const [checks, setChecks] = useState({ source: false, hash: false, scope: false });
  const [pendingDecision, setPendingDecision] = useState<{ decision: "approve" | "reject"; scope: VerificationScope; note: string } | null>(null);
  const { notify } = useToast();
  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ["verification-request", id],
    queryFn: () =>
      api.get<{ request: VerificationRequest }>(`/verification-requests/${id}`),
  });
  if (isLoading) return <LoadingSkeleton cards={2} label="Đang tải bằng chứng" />;
  if (loadError || !data) return <ErrorState description="Không thể tải yêu cầu xác minh này." />;
  const request = data.request;
  const evidence = request.evidence;
  const reviewComplete = checks.source && checks.hash && checks.scope;
  const prepareDecision = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const decision = submitter?.value === "reject" ? "reject" : "approve";
    if (decision === "approve" && !reviewComplete) {
      setError("Hoàn tất checklist trước khi duyệt và ký attestation.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setPendingDecision({ decision, scope: form.get("scope") as VerificationScope, note: String(form.get("note")) });
  };
  const decide = async () => {
    if (!evidence || !pendingDecision) return;
    setBusy(true);
    setError("");
    const { decision, scope, note } = pendingDecision;
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
      notify(decision === "approve" ? "Đã duyệt và ký attestation" : "Đã từ chối yêu cầu", { description: decision === "approve" ? "Chữ ký Solana và kết luận đã được ghi nhận." : "Ghi chú từ chối đã được lưu." });
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
      <nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/verifier/requests">Hàng đợi</Link><span aria-hidden="true">/</span><span>{request.asset?.assetCode}</span></nav>
      <PageHeader eyebrow="Yêu cầu xác minh" title={request.asset?.displayName || "Chi tiết bằng chứng"} description={`${request.asset?.assetCode} · ${request.requestedScope}`} actions={<SolanaWalletButton />} />
      <div className="verification-steps" aria-label="Quy trình xác minh"><span><b>1</b> Review</span><span><b>2</b> Sign</span><span><b>3</b> Confirm on-chain</span><span><b>4</b> Result</span></div>
      <div className="verification-layout">
        <section className="panel evidence-preview">
          <div className="preview-placeholder">
            <FileText size={42} />
            <strong>{evidence?.title}</strong>
            <span>{evidence?.mimeType}</span>
            {evidence && (
              <a href={`${config.apiBaseUrl}/evidence/${evidence.id}/file`} target="_blank" rel="noreferrer">
                Mở tệp <ExternalLink size={14} />
              </a>
            )}
          </div>
          <SectionHeader title="Thông tin nguồn" description="Dữ liệu nguồn và fingerprint của tệp được gửi." />
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
              <span className="hash-with-action"><code>{evidence?.contentHash}</code>{evidence?.contentHash ? <button className="text-link" type="button" aria-label="Sao chép hash bằng chứng" onClick={() => { void navigator.clipboard.writeText(evidence.contentHash); notify("Đã sao chép hash"); }}><Copy size={14} /></button> : null}</span>
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
          onSubmit={prepareDecision}
        >
          <SectionHeader title="Quyết định" description="Kiểm tra nguồn, phạm vi, độ mới và tính nhất quán trước khi kết luận." />
          <p>
            Chữ ký chỉ xác nhận đúng phạm vi dưới đây. Nó không chứng minh chất
            lượng hoặc quyền sở hữu ngoài phạm vi đó.
          </p>
          <fieldset className="review-checklist">
            <legend>Checklist trước khi ký</legend>
            <label><input type="checkbox" checked={checks.source} onChange={(event) => setChecks((current) => ({ ...current, source: event.target.checked }))} /><CheckCircle2 size={17} /> Đã kiểm tra nguồn và người gửi</label>
            <label><input type="checkbox" checked={checks.hash} onChange={(event) => setChecks((current) => ({ ...current, hash: event.target.checked }))} /><CheckCircle2 size={17} /> Đã mở tệp và đối chiếu hash</label>
            <label><input type="checkbox" checked={checks.scope} onChange={(event) => setChecks((current) => ({ ...current, scope: event.target.checked }))} /><CheckCircle2 size={17} /> Phạm vi kết luận không vượt quá bằng chứng</label>
          </fieldset>
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
              disabled={busy || !reviewComplete}
              title={!reviewComplete ? "Hoàn tất checklist trước khi duyệt" : undefined}
            >
              {busy ? "Đang ký và xác nhận…" : "Duyệt và ký trên Solana"}
            </button>
          </div>
        </form>
      </div>
      <ConfirmDialog open={Boolean(pendingDecision)} title={pendingDecision?.decision === "approve" ? "Duyệt và ký attestation?" : "Từ chối yêu cầu này?"} description={pendingDecision?.decision === "approve" ? "Ví Phantom sẽ ký hash attestation và giao dịch được ghi trên Solana. Chỉ tiếp tục khi phạm vi kết luận đã chính xác." : "Yêu cầu sẽ được đánh dấu từ chối cùng ghi chú của bạn. Hãy chắc chắn ghi chú đủ rõ để người gửi có thể khắc phục."} confirmLabel={pendingDecision?.decision === "approve" ? "Duyệt và ký" : "Xác nhận từ chối"} destructive={pendingDecision?.decision === "reject"} busy={busy} onCancel={() => setPendingDecision(null)} onConfirm={() => void decide()} />
    </div>
  );
}
