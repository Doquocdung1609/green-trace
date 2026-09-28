import { Download, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { StatusPill } from "../../components/StatusPill";
import { api } from "../../services/apiClient";
import type { Asset, ReadinessStatus } from "../../types/domain";

export function ReviewerDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["review-assets"],
    queryFn: () => api.get<{ assets: Asset[] }>("/assets"),
  });
  const [query, setQuery] = useState("");
  const [readiness, setReadiness] = useState<ReadinessStatus | "ALL">("ALL");
  const [region, setRegion] = useState("ALL");
  const [minScore, setMinScore] = useState(0);
  const regions = useMemo(
    () => [...new Set((data?.assets ?? []).map((asset) => asset.region))].sort(),
    [data],
  );
  const assets = useMemo(
    () =>
      (data?.assets ?? []).filter(
        (asset) =>
          (readiness === "ALL" || asset.passportStatus === readiness) &&
          (region === "ALL" || asset.region === region) &&
          (asset.trustProfile?.totalScore ?? 0) >= minScore &&
          `${asset.displayName} ${asset.assetCode} ${asset.region}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [data, readiness, region, minScore, query],
  );
  const exportSummary = (asset: Asset) => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            assetCode: asset.assetCode,
            displayName: asset.displayName,
            region: asset.region,
            readiness: asset.passportStatus,
            trustScore: asset.trustProfile?.totalScore,
            generatedAt: new Date().toISOString(),
            disclaimer:
              "Không phải định giá, điểm tín dụng hoặc khuyến nghị đầu tư.",
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${asset.assetCode}-passport-summary.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  if (isLoading)
    return <div className="page-state">Đang tải danh mục hộ chiếu…</div>;
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Cổng đối tác</p>
          <h1>Tra cứu hộ chiếu tài sản số</h1>
          <p>
            Xem nguồn bằng chứng, phạm vi xác minh, cảnh báo và giới hạn sử
            dụng.
          </p>
        </div>
      </div>
      <section className="filter-bar">
        <label>
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mã, tên tài sản hoặc khu vực…"
          />
        </label>
        <select
          value={readiness}
          onChange={(e) =>
            setReadiness(e.target.value as ReadinessStatus | "ALL")
          }
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="READY_FOR_FINANCIAL_REVIEW">Sẵn sàng xem xét</option>
          <option value="NEEDS_REVIEW">Cần xem xét</option>
          <option value="NOT_READY">Chưa sẵn sàng</option>
        </select>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="ALL">Tất cả khu vực</option>
          {regions.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <label className="score-filter">
          Điểm từ{" "}
          <input
            type="number"
            min="0"
            max="100"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          />
        </label>
      </section>
      {assets.length ? (
        <div className="asset-card-grid">
          {assets.map((asset) => (
            <article className="asset-card" key={asset.id}>
              <div className="asset-image">
                {asset.photoUrl ? (
                  <img src={asset.photoUrl} alt={asset.displayName} />
                ) : (
                  <span>GT</span>
                )}
              </div>
              <div>
                <small>{asset.assetCode}</small>
                <h2>{asset.displayName}</h2>
                <p>{asset.region}</p>
                <div className="asset-score">
                  <strong>{asset.trustProfile?.totalScore ?? 0}</strong>
                  <span>Điểm tin cậy hồ sơ</span>
                </div>
                <StatusPill value={asset.passportStatus} />
                <div className="card-actions">
                  <Link
                    className="button secondary"
                    to={`/passport/${asset.assetCode}`}
                  >
                    Mở hộ chiếu
                  </Link>
                  <button
                    onClick={() => exportSummary(asset)}
                    title="Xuất tóm tắt"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Không tìm thấy hồ sơ"
          description="Hãy thay đổi từ khóa hoặc bộ lọc."
        />
      )}
    </div>
  );
}
