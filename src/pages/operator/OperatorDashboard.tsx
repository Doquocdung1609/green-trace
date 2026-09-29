import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Plus,
  Sprout,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { StatCard } from "../../components/StatCard";
import { StatusPill } from "../../components/StatusPill";
import { AssetThumbnail } from "../../components/ui/AssetThumbnail";
import { DataTable } from "../../components/ui/DataTable";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { api } from "../../services/apiClient";
import type { Asset } from "../../types/domain";

export function OperatorDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["assets"],
    queryFn: () => api.get<{ assets: Asset[] }>("/assets"),
  });
  const assets = data?.assets ?? [];
  const pending = assets.filter((asset) =>
    asset.verificationRequests?.some((request) => request.status === "PENDING"),
  ).length;
  const warned = assets.filter(
    (asset) => (asset.trustProfile?.warningCount ?? 0) > 0,
  ).length;
  const ready = assets.filter(
    (asset) => asset.readinessProfiles?.some((profile) => profile.purpose === "FINANCIAL_REVIEW" && profile.status === "READY_FOR_REVIEW"),
  ).length;
  const transferReady = assets.filter((asset) => asset.readinessProfiles?.some((profile) => profile.purpose === "REAL_ASSET_TRANSFER" && profile.status === "READY_FOR_REVIEW")).length;
  const updatedToday = assets.filter((asset) => new Date(asset.updatedAt).toDateString() === new Date().toDateString()).length;
  const lifecycleRows = [
    ["Đăng ký", "REGISTERED"],
    ["Đã xác minh trồng", "PLANTED_VERIFIED"],
    ["Đang sinh trưởng", "GROWING"],
    ["Đã kiểm tra", "INSPECTED"],
    ["Trưởng thành", "MATURE"],
    ["Sẵn sàng thu hoạch", "HARVEST_READY"],
    ["Đã thu hoạch", "HARVESTED"],
    ["Đã lưu trữ", "ARCHIVED"],
  ].map(([label, stage]) => ({
    label,
    value: assets.filter((asset) => asset.currentStage === stage).length,
  }));
  const scoreRows = [
    {
      label: "Tốt (80–100)",
      value: assets.filter((asset) => (asset.trustProfile?.totalScore ?? 0) >= 80).length,
    },
    {
      label: "Cần bổ sung (50–79)",
      value: assets.filter((asset) => {
        const score = asset.trustProfile?.totalScore ?? 0;
        return score >= 50 && score < 80;
      }).length,
    },
    {
      label: "Rủi ro cao (0–49)",
      value: assets.filter((asset) => (asset.trustProfile?.totalScore ?? 0) < 50).length,
    },
  ];
  const evidenceRows = [
    {
      label: "Đủ dữ liệu",
      value: assets.filter((asset) => (asset.trustProfile?.evidenceScore ?? 0) >= 16).length,
    },
    {
      label: "Thiếu một phần",
      value: assets.filter((asset) => {
        const score = asset.trustProfile?.evidenceScore ?? 0;
        return score >= 8 && score < 16;
      }).length,
    },
    {
      label: "Thiếu nhiều",
      value: assets.filter((asset) => (asset.trustProfile?.evidenceScore ?? 0) < 8).length,
    },
  ];
  const requests = assets.flatMap((asset) => asset.verificationRequests ?? []);
  const resolved = requests.filter((request) => request.resolvedAt);
  const averageHours = resolved.length
    ? resolved.reduce(
        (sum, request) =>
          sum +
          (new Date(request.resolvedAt!).getTime() -
            new Date(request.createdAt).getTime()) /
            3_600_000,
        0,
      ) / resolved.length
    : 0;

  if (isLoading) return <LoadingSkeleton cards={5} label="Đang tải danh sách tài sản" />;
  if (error)
    return <ErrorState description="Không thể tải danh sách tài sản. Hãy kiểm tra kết nối và thử lại." action={<button className="button secondary" type="button" onClick={() => window.location.reload()}>Thử lại</button>} />;
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Không gian vận hành" title="Tổng quan tài sản" description="Theo dõi toàn bộ tài sản, tiến độ hồ sơ và chất lượng dữ liệu trên GreenTrace." actions={<Link className="button primary" to="/operator/assets/new">
          <Plus size={18} />
          Đăng ký tài sản
        </Link>} />
      <div className="stats-grid">
        <StatCard label="Tổng tài sản" value={assets.length} icon={Sprout} />
        <StatCard label="Cập nhật hôm nay" value={updatedToday} icon={FileCheck2} />
        <StatCard label="Cần xác minh / bổ sung" value={pending} icon={Clock3} />
        <StatCard label="Cảnh báo đang mở" value={warned} icon={AlertTriangle} />
        <StatCard label="Sẵn sàng chuyển quyền" value={transferReady} icon={CheckCircle2} />
        <StatCard
          label="Sẵn sàng xem xét tài chính"
          value={ready}
          icon={CheckCircle2}
        />
      </div>
      <div className="insight-grid">
        <section className="panel compact-panel">
          <SectionHeader title="Phân bố theo vòng đời" description="Số hồ sơ ở từng giai đoạn hiện tại." />
          <div className="bar-list">
            {lifecycleRows.map((row) => (
              <div className="bar-row" key={row.label}>
                <span>{row.label}</span>
                <div><i style={{ width: `${assets.length ? Math.max((row.value / assets.length) * 100, row.value ? 6 : 0) : 0}%` }} /></div>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel compact-panel">
          <SectionHeader title="Chất lượng hồ sơ" description="Nhóm theo điểm tin cậy mới nhất." />
          <div className="bar-list">
            {scoreRows.map((row) => (
              <div className="bar-row" key={row.label}>
                <span>{row.label}</span>
                <div><i style={{ width: `${assets.length ? Math.max((row.value / assets.length) * 100, row.value ? 6 : 0) : 0}%` }} /></div>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel compact-panel">
          <SectionHeader title="Bằng chứng còn thiếu" description="Độ đầy đủ theo điểm bằng chứng 20." />
          <div className="bar-list">
            {evidenceRows.map((row) => (
              <div className="bar-row" key={row.label}>
                <span>{row.label}</span>
                <div><i style={{ width: `${assets.length ? Math.max((row.value / assets.length) * 100, row.value ? 6 : 0) : 0}%` }} /></div>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel compact-panel turnaround-panel">
          <SectionHeader title="Thời gian xác minh" description="Tính từ lúc gửi đến lúc có quyết định." />
          <div className="turnaround-metrics">
            <div><strong>{averageHours ? `${averageHours.toFixed(1)} giờ` : "Chưa có"}</strong><span>Trung bình đã xử lý</span></div>
            <div><strong>{requests.filter((request) => request.status === "PENDING").length}</strong><span>Yêu cầu đang chờ</span></div>
            <div><strong>{resolved.length}</strong><span>Yêu cầu đã xử lý</span></div>
          </div>
        </section>
      </div>
      <section className="panel">
        <SectionHeader title="Danh sách tài sản gần đây" description="Điểm phản ánh chất lượng hồ sơ, không phản ánh giá trị tài sản." />
        {assets.length === 0 ? (
          <EmptyState
            title="Chưa có tài sản"
            description="Đăng ký tài sản đầu tiên để bắt đầu thu thập bằng chứng."
            action={
              <Link className="button primary" to="/operator/assets/new">
                Tạo hồ sơ
              </Link>
            }
          />
        ) : (
          <DataTable label="Danh sách tài sản gần đây">
              <thead>
                <tr>
                  <th>Tài sản</th>
                  <th>Khu vực</th>
                  <th>Vòng đời</th>
                  <th>Điểm tin cậy</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><AssetThumbnail src={asset.photoUrl} alt={asset.displayName} /><span><strong>{asset.displayName}</strong><small>{asset.assetCode}</small></span></div>
                    </td>
                    <td>{asset.region}</td>
                    <td>
                      <StatusPill value={asset.currentStage} />
                    </td>
                    <td>
                      <div className="score-cell">
                        <strong>{asset.trustProfile?.totalScore ?? 0}</strong>
                        <ProgressBar value={asset.trustProfile?.totalScore ?? 0} label={`Điểm tin cậy của ${asset.displayName}`} />
                      </div>
                    </td>
                    <td>
                      <StatusPill value={asset.passportStatus} />
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        to={`/operator/assets/${asset.id}/evidence`}
                      >
                        Mở hồ sơ
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
          </DataTable>
        )}
      </section>
    </div>
  );
}
