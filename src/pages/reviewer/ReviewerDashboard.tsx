import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { StatusPill } from "../../components/StatusPill";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useToast } from "../../hooks/useToast";
import { api } from "../../services/apiClient";
import type { Asset } from "../../types/domain";

interface ReviewCase { id: string; purpose: string; status: string; decision?: string | null; notes?: string | null; createdAt: string; asset: Asset; requestedBy: { fullName: string } }

export function ReviewerDashboard() {
  const client = useQueryClient();
  const { notify } = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data, isLoading, error } = useQuery({ queryKey: ["review-cases"], queryFn: () => api.get<{ cases: ReviewCase[] }>("/review-cases") });
  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: string }) => api.patch(`/review-cases/${id}`, { decision, notes: notes[id] || "Đã rà soát dossier theo mục đích và ghi nhận quyết định." }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["review-cases"] }); notify("Đã lưu quyết định review case"); },
    onError: (reason) => notify("Không thể lưu quyết định", { tone: "error", description: reason instanceof Error ? reason.message : "Vui lòng thử lại." }),
  });
  const claim = useMutation({
    mutationFn: (id: string) => api.post(`/review-cases/${id}/claim`),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["review-cases"] }); notify("Đã claim review case"); },
    onError: (reason) => notify("Không thể claim case", { tone: "error", description: reason instanceof Error ? reason.message : "Case có thể đã được reviewer khác nhận." }),
  });
  if (isLoading) return <LoadingSkeleton cards={4} label="Đang tải review case" />;
  if (error) return <EmptyState title="Không thể tải review case" description="Hãy kiểm tra API và thử lại." />;
  const cases = data?.cases ?? [];
  return <div className="page-stack"><PageHeader eyebrow="Thẩm định hồ sơ" title="Rà soát theo mục đích" description="Đối tác thẩm định kết luận trên toàn bộ hồ sơ theo mục đích; không duyệt lại từng bằng chứng thay cho người xác minh." />
    <div className="stats-grid"><div className="stat-card"><ClipboardCheck /><span>Case đang chờ</span><strong>{cases.filter((item) => item.status === "PENDING").length}</strong></div><div className="stat-card"><ShieldAlert /><span>Cần bổ sung</span><strong>{cases.filter((item) => item.decision === "NEEDS_SUPPLEMENT").length}</strong></div></div>
    <section className="panel"><SectionHeader title="Danh sách hồ sơ rà soát" description="Trust, Risk, Rights và Custody được trình bày riêng để tránh suy diễn." />
      {cases.length ? <div className="passport-records">{cases.map((item) => <article key={item.id}><div><strong>{item.asset.displayName}</strong><span>{item.asset.assetCode} · {item.purpose} · yêu cầu bởi {item.requestedBy.fullName}</span></div><StatusPill value={item.decision || item.status} />
        <div className="review-dossier-grid"><span>Trust <b>{item.asset.trustProfile?.totalScore ?? 0}/100</b></span><span>Risk <b>{item.asset.riskProfile?.overallRisk ?? "—"}</b></span><span>Quyền <b>{item.asset.rightsRecords?.[0]?.verifiedStatus ?? "THIẾU"}</b></span><span>Lưu ký <b>{item.asset.custodyRecords?.[0]?.status ?? "THIẾU"}</b></span></div>
        <div className="review-dossier-details">
          <div><strong>Bằng chứng trọng yếu đã xác minh</strong><span>{item.asset.evidence?.length ? item.asset.evidence.map((evidence) => evidence.type).join(" · ") : "Chưa có"}</span></div>
          <div><strong>Sự cố đang mở</strong><span>{item.asset.incidents?.length ? item.asset.incidents.map((incident) => `${incident.type} (${incident.severity})`).join(" · ") : "Không có"}</span></div>
          <div><strong>Vòng đời gần nhất</strong><span>{item.asset.lifecycleEvents?.[0]?.stageTo ?? item.asset.currentStage}</span></div>
          <div><strong>Khoảng trống readiness</strong><span>{item.asset.readinessProfiles?.flatMap((profile) => profile.missingItems).join(" · ") || "Không có"}</span></div>
        </div>
        <Link className="text-link" to={`/passport/${item.asset.assetCode}`}>Mở hộ chiếu công khai</Link>
        {item.status === "PENDING" ? <div className="card-actions"><button type="button" className="button primary compact" disabled={claim.isPending} onClick={() => claim.mutate(item.id)}>Claim hồ sơ</button></div> : item.status === "CLAIMED" ? <><label>Ghi chú<textarea value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} /></label><div className="card-actions"><button type="button" className="button secondary compact" onClick={() => decide.mutate({ id: item.id, decision: "NOT_READY" })}>Chưa sẵn sàng</button><button type="button" className="button secondary compact" onClick={() => decide.mutate({ id: item.id, decision: "NEEDS_SUPPLEMENT" })}>Cần bổ sung</button><button type="button" className="button primary compact" onClick={() => decide.mutate({ id: item.id, decision: "READY_FOR_REVIEW" })}>Sẵn sàng review</button></div></> : <p>{item.notes}</p>}
      </article>)}</div> : <EmptyState title="Chưa có review case" description="Operator hoặc buyer có thể gửi dossier theo mục đích cụ thể." />}
    </section>
  </div>;
}
