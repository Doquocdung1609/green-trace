import { ExternalLink, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DataTable } from "../../components/ui/DataTable";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { PageHeader } from "../../components/ui/PageHeader";
import { Pagination } from "../../components/ui/Pagination";
import { SearchInput } from "../../components/ui/Inputs";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { WalletStatus } from "../../components/ui/WalletStatus";
import { useToast } from "../../hooks/useToast";
import { api } from "../../services/apiClient";
import { getSolanaExplorerUrl } from "../../solana/explorer";
import { useSolanaWallet } from "../../solana/useSolanaWallet";
import type { Attestation } from "../../types/domain";

interface ManagedAttestation extends Attestation {
  asset: { assetCode: string; displayName: string; region?: string; photoUrl?: string | null };
  evidence: { title: string; contentHash: string };
}

export function SignedAttestations() {
  const wallet = useSolanaWallet();
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ManagedAttestation | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["my-attestations"], queryFn: () => api.get<{ attestations: ManagedAttestation[] }>("/attestations/mine") });
  const filtered = useMemo(() => (data?.attestations ?? []).filter((item) => `${item.asset.displayName} ${item.asset.assetCode} ${item.evidence.title} ${item.scope}`.toLowerCase().includes(query.toLowerCase())), [data, query]);
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const revoke = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      if (!wallet.address) throw new Error("Kết nối đúng ví Phantom đã ký attestation.");
      const canonical = await api.post<{ payloadHash: string }>(`/attestations/${selected.id}/revoke/payload`, { verifierWallet: wallet.address });
      const txSignature = await wallet.anchorHash("ATTESTATION_REVOCATION", canonical.payloadHash);
      await api.post(`/attestations/${selected.id}/revoke`, { verifierWallet: wallet.address, payloadHash: canonical.payloadHash, txSignature });
      await refetch();
      notify("Đã thu hồi attestation", { description: "Giao dịch thu hồi đã được ký và ghi nhận on-chain." });
      setSelected(null);
    } catch (reason) {
      notify("Không thể thu hồi attestation", { description: reason instanceof Error ? reason.message : "Vui lòng thử lại.", tone: "error" });
    } finally { setBusy(false); }
  };
  if (isLoading) return <LoadingSkeleton label="Đang tải attestation đã ký" />;
  if (error) return <ErrorState description="Không thể tải danh sách attestation đã ký." />;
  return <div className="page-stack">
    <PageHeader eyebrow="Xác minh & chứng nhận" title="Attestation đã ký" description="Thu hồi phải được ký bởi đúng ví ban đầu và được ghi nhận on-chain." actions={<WalletStatus />} />
    <section className="filter-bar"><SearchInput label="Tìm attestation" placeholder="Tìm theo tài sản, mã hồ sơ, bằng chứng…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></section>
    <section className="panel"><SectionHeader title="Danh sách attestation đã ký" description={`${filtered.length} bản ghi phù hợp`} />
      {rows.length ? <>
        <DataTable label="Danh sách attestation đã ký"><thead><tr><th>Tài sản</th><th>Bằng chứng</th><th>Phạm vi</th><th>Hiệu lực</th><th>Trạng thái</th><th>Hành động</th></tr></thead><tbody>{rows.map((item) => { const expired = item.expiresAt ? new Date(item.expiresAt).getTime() < Date.now() : false; return <tr key={item.id}><td><strong>{item.asset.displayName}</strong><small>{item.asset.assetCode}</small><Link className="text-link" to={`/passport/${item.asset.assetCode}`}>Chi tiết</Link></td><td><strong>{item.evidence.title}</strong>{item.txSignature ? <a className="text-link" href={getSolanaExplorerUrl(item.txSignature)} target="_blank" rel="noreferrer"><ExternalLink size={13} /> On-chain</a> : null}</td><td>{item.scope}</td><td>{item.expiresAt ? new Date(item.expiresAt).toLocaleDateString("vi-VN") : "Không giới hạn"}</td><td><StatusBadge value={item.revokedAt ? "DANGER" : expired ? "EXPIRED" : "ACTIVE"} label={item.revokedAt ? "Đã thu hồi" : expired ? "Đã hết hạn" : "Đang hiệu lực"} /></td><td><button className="button danger compact" type="button" disabled={Boolean(item.revokedAt)} onClick={() => setSelected(item)}><Trash2 size={15} /> Thu hồi</button></td></tr>; })}</tbody></DataTable>
        <Pagination page={page} pages={pages} onChange={setPage} />
      </> : <EmptyState title={query ? "Không tìm thấy attestation phù hợp" : "Chưa có attestation nào"} description={query ? "Thử thay đổi từ khóa tìm kiếm." : "Các attestation đã ký sẽ xuất hiện tại đây."} />}
    </section>
    <ConfirmDialog open={Boolean(selected)} title="Thu hồi attestation này?" description="Hành động sẽ tạo một bản ghi thu hồi mới trên Solana. Lịch sử attestation gốc vẫn được giữ để kiểm toán." confirmLabel="Ký và thu hồi" destructive busy={busy} onCancel={() => setSelected(null)} onConfirm={() => void revoke()} />
  </div>;
}
