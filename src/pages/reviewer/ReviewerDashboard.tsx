import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { EmptyState } from "../../components/EmptyState";
import { PassportCard } from "../../components/ui/Cards";
import { ErrorState } from "../../components/ui/ErrorState";
import { FilterSelect, SearchInput } from "../../components/ui/Inputs";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../hooks/useToast";
import { api } from "../../services/apiClient";
import type { Asset, ReadinessStatus } from "../../types/domain";

export function ReviewerDashboard() {
  const { notify } = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ["review-assets"],
    queryFn: () => api.get<{ assets: Asset[] }>("/assets"),
  });
  const [query, setQuery] = useState("");
  const [readiness, setReadiness] = useState<ReadinessStatus | "ALL">("ALL");
  const [region, setRegion] = useState("ALL");
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<"score" | "newest">("score");
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
      ).sort((left, right) => sort === "score" ? (right.trustProfile?.totalScore ?? 0) - (left.trustProfile?.totalScore ?? 0) : new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [data, readiness, region, minScore, query, sort],
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
    notify("Đã xuất tóm tắt hộ chiếu", { description: `${asset.assetCode} được tải dưới dạng JSON có cấu trúc.` });
  };
  if (isLoading) return <LoadingSkeleton cards={6} label="Đang tải danh mục hộ chiếu" />;
  if (error) return <ErrorState description="Không thể tải danh mục hộ chiếu tài sản." />;
  return (
    <div className="page-stack">
      <PageHeader eyebrow="Cổng đối tác" title="Tra cứu hộ chiếu tài sản số" description="Khám phá và đánh giá hồ sơ tài sản nông nghiệp. Xem nguồn gốc, bằng chứng, mức độ tin cậy và các cảnh báo rủi ro trước khi hợp tác." />
      <section className="filter-bar">
        <SearchInput label="Tìm hộ chiếu"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mã, tên tài sản hoặc khu vực…"
          />
        <FilterSelect label="Trạng thái"
          value={readiness}
          onChange={(e) =>
            setReadiness(e.target.value as ReadinessStatus | "ALL")
          }
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="READY_FOR_FINANCIAL_REVIEW">Sẵn sàng xem xét</option>
          <option value="NEEDS_REVIEW">Cần xem xét</option>
          <option value="NOT_READY">Chưa sẵn sàng</option>
        </FilterSelect>
        <FilterSelect label="Khu vực" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="ALL">Tất cả khu vực</option>
          {regions.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </FilterSelect>
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
        <FilterSelect label="Sắp xếp" value={sort} onChange={(event) => setSort(event.target.value as "score" | "newest")}><option value="score">Điểm cao nhất</option><option value="newest">Mới cập nhật</option></FilterSelect>
      </section>
      <div className="reviewer-summary"><div><h2>{assets.length} hộ chiếu tài sản</h2><p>Kết quả phù hợp với bộ lọc hiện tại</p></div></div>
      {assets.length ? (
        <div className="asset-card-grid">
          {assets.map((asset) => <PassportCard key={asset.id} asset={asset} onExport={exportSummary} />)}
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
