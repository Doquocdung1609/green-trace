import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins, PackageCheck, ShoppingBag, Sprout } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { StatusPill } from "../../components/StatusPill";
import { AssetThumbnail } from "../../components/ui/AssetThumbnail";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useToast } from "../../hooks/useToast";
import { api } from "../../services/apiClient";
import type { AssetOffer, AssetTransaction } from "../../types/domain";

const money = (value: number, currency: string) => new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(value);

export function MyAssets() {
  const client = useQueryClient();
  const { notify } = useToast();
  const offers = useQuery({ queryKey: ["offers"], queryFn: () => api.get<{ offers: AssetOffer[] }>("/offers") });
  const owned = useQuery({ queryKey: ["my-assets"], queryFn: () => api.get<{ transactions: AssetTransaction[] }>("/my-assets") });
  const purchase = useMutation({
    mutationFn: (offerId: string) => api.post(`/offers/${offerId}/purchase-request`, { notes: "Yêu cầu mua đứt tài sản và xem xét phương án tiếp tục chăm sóc." }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["my-assets"] }); notify("Đã gửi yêu cầu mua", { description: "Giao dịch chỉ chuyển sang bước xem xét; chưa thay đổi quyền hay lưu ký." }); },
    onError: (error) => notify("Không thể gửi yêu cầu", { tone: "error", description: error instanceof Error ? error.message : "Vui lòng thử lại." }),
  });
  const fulfillment = useMutation({
    mutationFn: (assetId: string) => api.post(`/assets/${assetId}/fulfillment`, { type: "HARVEST", notes: "Đề nghị phối hợp lịch thu hoạch và bàn giao." }),
    onSuccess: () => notify("Đã gửi yêu cầu thực hiện"),
    onError: (error) => notify("Chưa thể gửi yêu cầu", { tone: "error", description: error instanceof Error ? error.message : "Chỉ giao dịch hoàn tất mới được thực hiện." }),
  });
  if (offers.isLoading || owned.isLoading) return <LoadingSkeleton cards={4} label="Đang tải tài sản và đề nghị bán" />;
  const transactions = owned.data?.transactions ?? [];
  return <div className="page-stack">
    <PageHeader eyebrow="Không gian người mua" title="Tài sản của tôi" description="Theo dõi quyền giao dịch, nơi lưu ký, chăm sóc và yêu cầu thu hoạch — độc lập với vòng đời sinh học." />
    <section className="panel"><SectionHeader title="Đề nghị mua đứt đang mở" description="GreenTrace không chia nhỏ tài sản, không phát hành NFT và không cam kết lợi nhuận." icon={ShoppingBag} />
      {offers.data?.offers.length ? <div className="asset-card-grid">{offers.data.offers.map((offer) => <article className="passport-card" key={offer.id}>
        <AssetThumbnail src={offer.asset?.photoUrl} alt={offer.asset?.displayName ?? "Tài sản"} size={72} /><div><strong>{offer.asset?.displayName}</strong><span>{offer.asset?.assetCode} · {offer.asset?.region}</span></div>
        <dl className="detail-list"><dt>Giá đề nghị</dt><dd>{money(offer.askingPrice, offer.currency)}</dd><dt>Vòng đời sinh học</dt><dd><StatusPill value={offer.asset?.currentStage ?? "REGISTERED"} /></dd><dt>Điểm hồ sơ</dt><dd>{offer.asset?.trustProfile?.totalScore ?? 0}/100</dd></dl>
        <button className="button primary" type="button" disabled={purchase.isPending} onClick={() => purchase.mutate(offer.id)}><HandCoins size={17} /> Gửi yêu cầu mua</button>
      </article>)}</div> : <EmptyState title="Chưa có đề nghị bán" description="Các đề nghị mua đứt đủ điều kiện sẽ xuất hiện tại đây." />}
    </section>
    <section className="panel"><SectionHeader title="Quyền mua và yêu cầu của tôi" description="Bán quyền không tự động đổi người đang giữ hoặc trạng thái sinh trưởng." icon={Sprout} />
      {transactions.length ? <div className="passport-records">{transactions.map((transaction) => <article key={transaction.id}><div><strong>{transaction.asset.displayName}</strong><span>{transaction.asset.assetCode} · {money(transaction.price, transaction.currency)}</span></div><StatusPill value={transaction.status} /><p>Vòng đời: {transaction.asset.currentStage} · Giao dịch: {transaction.asset.transactionStage} · Lưu ký sau bán: {transaction.custodyAfterSale}</p><div className="card-actions"><Link className="button primary compact" to={`/my-assets/${transaction.asset.id}`}>Mở hồ sơ riêng</Link><Link className="button secondary compact" to={`/passport/${transaction.asset.assetCode}`}>Hộ chiếu công khai</Link>{transaction.status === "COMPLETED" ? <button className="button secondary compact" type="button" onClick={() => fulfillment.mutate(transaction.asset.id)}><PackageCheck size={16} /> Yêu cầu thu hoạch</button> : null}</div></article>)}</div> : <EmptyState title="Bạn chưa có giao dịch" description="Yêu cầu mua đã gửi và giao dịch hoàn tất sẽ được theo dõi tại đây." />}
    </section>
  </div>;
}
