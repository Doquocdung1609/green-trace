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
    (asset) => asset.passportStatus === "READY_FOR_FINANCIAL_REVIEW",
  ).length;
  const lifecycleRows = [
    ["Đăng ký", "REGISTERED"],
    ["Đã xác minh trồng", "PLANTED_VERIFIED"],
    ["Đang sinh trưởng", "GROWING"],
    ["Đã kiểm tra", "INSPECTED"],
    ["Trưởng thành", "MATURE"],
    ["Sẵn sàng thu hoạch", "HARVEST_READY"],
    ["Đã thu hoạch", "HARVESTED"],
    ["Đã chuyển giao", "TRANSFERRED"],
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

  if (isLoading)
    return <div className="page-state">Đang tải danh sách tài sản…</div>;
  if (error)
    return (
      <div className="page-state error">
        Không thể tải dữ liệu. Hãy kiểm tra backend.
      </div>
    );
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Không gian vận hành</p>
          <h1>Tổng quan tài sản</h1>
          <p>Theo dõi độ đầy đủ, xác minh và cảnh báo của từng hồ sơ.</p>
        </div>
        <Link className="button primary" to="/operator/assets/new">
          <Plus size={18} />
          Đăng ký tài sản
        </Link>
      </div>
      <div className="stats-grid">
        <StatCard label="Tổng tài sản" value={assets.length} icon={Sprout} />
        <StatCard
          label="Hồ sơ đủ dữ liệu"
          value={
            assets.filter((a) => (a.trustProfile?.evidenceScore ?? 0) >= 16)
              .length
          }
          icon={FileCheck2}
        />
        <StatCard label="Chờ xác minh" value={pending} icon={Clock3} />
        <StatCard label="Có cảnh báo" value={warned} icon={AlertTriangle} />
        <StatCard
          label="Sẵn sàng xem xét tài chính"
          value={ready}
          icon={CheckCircle2}
        />
      </div>
      <div className="insight-grid">
        <section className="panel compact-panel">
          <div className="panel-heading">
            <div><h2>Phân bố vòng đời</h2><p>Số hồ sơ ở từng giai đoạn hiện tại.</p></div>
          </div>
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
          <div className="panel-heading">
            <div><h2>Chất lượng hồ sơ</h2><p>Nhóm theo điểm tin cậy mới nhất.</p></div>
          </div>
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
          <div className="panel-heading">
            <div><h2>Bằng chứng còn thiếu</h2><p>Độ đầy đủ theo điểm bằng chứng 20.</p></div>
          </div>
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
          <div className="panel-heading">
            <div><h2>Thời gian xác minh</h2><p>Tính từ lúc gửi đến lúc có quyết định.</p></div>
          </div>
          <div className="turnaround-metrics">
            <div><strong>{averageHours ? `${averageHours.toFixed(1)} giờ` : "Chưa có"}</strong><span>Trung bình đã xử lý</span></div>
            <div><strong>{requests.filter((request) => request.status === "PENDING").length}</strong><span>Yêu cầu đang chờ</span></div>
            <div><strong>{resolved.length}</strong><span>Yêu cầu đã xử lý</span></div>
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Hồ sơ gần đây</h2>
            <p>
              Điểm phản ánh chất lượng hồ sơ, không phản ánh giá trị tài sản.
            </p>
          </div>
        </div>
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
          <div className="data-table-wrap">
            <table className="data-table">
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
                      <strong>{asset.displayName}</strong>
                      <small>{asset.assetCode}</small>
                    </td>
                    <td>{asset.region}</td>
                    <td>
                      <StatusPill value={asset.currentStage} />
                    </td>
                    <td>
                      <div className="score-cell">
                        <strong>{asset.trustProfile?.totalScore ?? 0}</strong>
                        <div>
                          <span
                            style={{
                              width: `${asset.trustProfile?.totalScore ?? 0}%`,
                            }}
                          />
                        </div>
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
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
