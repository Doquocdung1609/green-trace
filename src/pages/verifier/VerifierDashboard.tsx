import { BadgeCheck, Ban, Clock3, FileSignature, Hourglass } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { MetricCard } from "../../components/ui/MetricCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { VerificationCard } from "../../components/ui/Cards";
import { WalletStatus } from "../../components/ui/WalletStatus";
import { api } from "../../services/apiClient";
import type { VerificationRequest } from "../../types/domain";

export function VerifierDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["verification-requests"],
    queryFn: () => api.get<{ requests: VerificationRequest[] }>("/verification-requests"),
  });
  if (isLoading) return <LoadingSkeleton label="Đang tải trung tâm xác minh" />;
  if (error) return <ErrorState description="Không thể tải danh sách công việc xác minh." />;
  const requests = data?.requests ?? [];
  const pending = requests.filter((request) => request.status === "PENDING");
  const resolved = requests.filter((request) => request.status !== "PENDING").slice(0, 5);
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Trung tâm xác minh" title="Công việc của bạn" description="Chỉ xác nhận phạm vi bạn có đủ thẩm quyền và bằng chứng để kết luận." actions={<><WalletStatus /><Link className="button primary" to="/verifier/requests">Mở hàng đợi</Link></>} />
      <div className="stats-grid four">
        <MetricCard label="Đang chờ xác minh" value={pending.length} icon={Clock3} hint="Yêu cầu cần xử lý" />
        <MetricCard label="Đã duyệt" value={requests.filter((request) => request.status === "APPROVED").length} icon={BadgeCheck} hint="Trong danh sách hiện tại" />
        <MetricCard label="Đã từ chối" value={requests.filter((request) => request.status === "REJECTED").length} icon={Ban} hint="Có ghi chú kết luận" />
        <MetricCard label="Sắp / đã hết hiệu lực" value={requests.filter((request) => request.status === "EXPIRED").length} icon={Hourglass} hint="Cần rà soát lại" />
      </div>
      <div className="insight-grid">
        <section className="panel">
          <SectionHeader title={`Ưu tiên hôm nay (${Math.min(pending.length, 3)})`} description="Các yêu cầu đang chờ theo thứ tự mới nhất." action={<Link className="text-link" to="/verifier/requests">Xem tất cả</Link>} />
          <div className="page-stack">{pending.slice(0, 3).map((request) => <VerificationCard key={request.id} request={request} />)}{pending.length === 0 ? <EmptyState title="Không có yêu cầu đang chờ" description="Hàng đợi xác minh của bạn đang trống." /> : null}</div>
        </section>
        <section className="panel">
          <SectionHeader title="Hàng đợi xác minh" description="Các yêu cầu cần bạn kiểm tra phạm vi và nguồn." action={<Link className="text-link" to="/verifier/requests">Mở hàng đợi</Link>} />
          {pending.slice(3, 8).map((request) => <Link className="request-row" key={request.id} to={`/verifier/requests/${request.id}`}><div><strong>{request.asset?.displayName}</strong><span>{request.asset?.assetCode}</span></div><span>{request.requestedScope}</span><time>{new Date(request.createdAt).toLocaleDateString("vi-VN")}</time></Link>)}
          {pending.length <= 3 ? <EmptyState title="Đã hiển thị hết công việc" description="Không còn yêu cầu nào khác trong hàng đợi." /> : null}
        </section>
      </div>
      <section className="panel">
        <SectionHeader title="Xác minh gần đây" description="Các kết luận gần nhất trong hàng đợi của bạn." action={<Link className="button secondary compact" to="/verifier/attestations"><FileSignature size={16} /> Attestation đã ký</Link>} />
        {resolved.length ? resolved.map((request) => <Link className="request-row" key={request.id} to={`/verifier/requests/${request.id}`}><div><strong>{request.asset?.displayName}</strong><span>{request.evidence?.title}</span></div><span>{request.status}</span><time>{request.resolvedAt ? new Date(request.resolvedAt).toLocaleString("vi-VN") : "—"}</time></Link>) : <EmptyState title="Chưa có kết luận" description="Các yêu cầu đã xử lý sẽ xuất hiện tại đây." />}
      </section>
    </div>
  );
}
