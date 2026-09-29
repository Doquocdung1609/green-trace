import { useQueryClient } from "@tanstack/react-query";
import { Activity, FileKey2, HandCoins, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { EmptyState } from "../EmptyState";
import { StatusPill } from "../StatusPill";
import { SectionHeader } from "../ui/SectionHeader";
import { useToast } from "../../hooks/useToast";
import { api } from "../../services/apiClient";
import type { Asset } from "../../types/domain";

export type ProductTab = "biological" | "rights" | "commerce" | "readiness";

export function AssetProductSections({ asset, tab }: { asset: Asset; tab: ProductTab }) {
  const client = useQueryClient();
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>, path: string, build: (data: FormData) => object, message: string) => {
    event.preventDefault(); setBusy(true); setError("");
    const form = event.currentTarget;
    try { await api.post(path, build(new FormData(form))); form.reset(); await client.invalidateQueries({ queryKey: ["asset", asset.id] }); notify(message); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể lưu dữ liệu"); }
    finally { setBusy(false); }
  };
  const requestReview = async (purpose: "REAL_ASSET_TRANSFER" | "FINANCIAL_REVIEW") => {
    setBusy(true); setError("");
    try { await api.post("/review-cases", { purpose, assetId: asset.id }); notify("Đã tạo review case", { description: "Reviewer sẽ đánh giá dossier theo đúng mục đích đã chọn." }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tạo review case"); }
    finally { setBusy(false); }
  };
  const resolveIncident = async (incidentId: string) => {
    setBusy(true); setError("");
    try {
      await api.patch(`/incidents/${incidentId}`, { status: "RESOLVED", resolutionNote: "Đã xử lý và đóng sự cố trong workspace." });
      await client.invalidateQueries({ queryKey: ["asset", asset.id] });
      notify("Đã đóng sự cố và tính lại hồ sơ rủi ro");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật sự cố");
    } finally { setBusy(false); }
  };
  const updateFulfillment = async (requestId: string, status: "SCHEDULED" | "COMPLETED") => {
    setBusy(true); setError("");
    try {
      await api.patch(`/fulfillment/${requestId}`, { status });
      await client.invalidateQueries({ queryKey: ["asset", asset.id] });
      notify(status === "SCHEDULED" ? "Đã xác nhận lịch thực hiện" : "Đã hoàn tất yêu cầu");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể cập nhật yêu cầu thực hiện");
    } finally { setBusy(false); }
  };
  if (tab === "biological") return <div className="two-columns"><section className="panel"><SectionHeader title="Đo lường sinh học" description="Dữ liệu quan sát không phải định giá và không tự động trở thành xác minh độc lập." icon={Activity} />
    {asset.measurements?.length ? <div className="passport-records">{asset.measurements.map((item) => <article key={item.id}><div><strong>{item.measurementType}</strong><span>{new Date(item.observedAt).toLocaleString("vi-VN")}</span></div><b>{item.value} {item.unit}</b><StatusPill value={item.verificationStatus} /></article>)}</div> : <EmptyState title="Chưa có đo lường" description="Ghi chiều cao, sức khỏe, ra hoa hoặc tình trạng rễ." />}
    <SectionHeader title="Sự cố sinh học" description="Sự cố MEDIUM trở lên cần xác minh theo policy." />
    {asset.incidents?.length ? <div className="risk-list">{asset.incidents.map((item) => <article className={`warning warning-${item.severity.toLowerCase()}`} key={item.id}><div><strong>{item.type} · {item.severity}</strong><span>{item.status} · {new Date(item.detectedAt).toLocaleDateString("vi-VN")}</span><p>{item.description}</p>{item.status !== "RESOLVED" ? <button type="button" className="button secondary compact" disabled={busy} onClick={() => void resolveIncident(item.id)}>Đánh dấu đã xử lý</button> : null}</div></article>)}</div> : <EmptyState title="Không có sự cố đang ghi nhận" description="Rủi ro không bị trộn vào điểm tin cậy hồ sơ." />}
  </section><div className="page-stack"><form className="panel compact-form" onSubmit={(event) => void submit(event, `/assets/${asset.id}/measurements`, (data) => ({ measurementType: data.get("measurementType"), value: data.get("value"), unit: data.get("unit"), observedAt: data.get("observedAt") }), "Đã ghi đo lường") }><SectionHeader title="Ghi đo lường" /><label>Chỉ số<select name="measurementType"><option>HEIGHT_CM</option><option>WEIGHT_GRAMS</option><option>HEALTH_STATUS</option><option>FLOWERING_STATUS</option><option>ROOT_CONDITION</option></select></label><div className="form-grid"><label>Giá trị<input name="value" required /></label><label>Đơn vị<input name="unit" required /></label></div><label>Quan sát lúc<input name="observedAt" type="datetime-local" required /></label><button className="button primary" disabled={busy}>Lưu đo lường</button></form>
  <form className="panel compact-form" onSubmit={(event) => void submit(event, `/assets/${asset.id}/incidents`, (data) => ({ type: data.get("type"), severity: data.get("severity"), detectedAt: data.get("detectedAt"), description: data.get("description"), evidenceIds: [] }), "Đã ghi sự cố và tính lại rủi ro") }><SectionHeader title="Báo cáo sự cố" /><div className="form-grid"><label>Loại<select name="type"><option>DISEASE</option><option>PEST</option><option>DROUGHT</option><option>FLOOD</option><option>PHYSICAL_DAMAGE</option><option>THEFT_OR_LOSS</option><option>BIOLOGICAL_LOSS</option><option>QUALITY_DEGRADATION</option><option>OTHER</option></select></label><label>Mức độ<select name="severity"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label></div><label>Phát hiện lúc<input name="detectedAt" type="datetime-local" required /></label><label>Mô tả<textarea name="description" required /></label><button className="button secondary" disabled={busy}>Ghi sự cố</button></form></div>{error ? <p className="form-error">{error}</p> : null}</div>;
  if (tab === "rights") return <div className="two-columns"><section className="panel"><SectionHeader title="Quyền, lưu ký và chăm sóc" description="Ba lớp này độc lập; thay đổi quyền không mặc nhiên di chuyển tài sản vật lý." icon={FileKey2} />
    <h3>Quyền</h3>{asset.rightsRecords?.map((item) => <article className="record-row" key={item.id}><div><strong>{item.rightType}</strong><span>{item.holder}</span></div><StatusPill value={item.verifiedStatus} /></article>)}
    <h3>Lưu ký vật lý</h3>{asset.custodyRecords?.map((item) => <article className="record-row" key={item.id}><div><strong>{item.physicalCustodian}</strong><span>{item.location}</span></div><StatusPill value={item.status} /></article>)}
    <h3>Thỏa thuận chăm sóc</h3>{asset.careAgreements?.map((item) => <article className="record-row" key={item.id}><div><strong>{item.careFrequency}</strong><span>{item.responsibility}</span></div><StatusPill value={item.status} /></article>)}
  </section><div className="page-stack"><form className="panel compact-form" onSubmit={(event) => void submit(event, `/assets/${asset.id}/rights`, (data) => ({ rightType: data.get("rightType"), holder: data.get("holder"), validFrom: data.get("validFrom"), verifiedStatus: "PENDING" }), "Đã thêm hồ sơ quyền") }><SectionHeader title="Thêm khai báo quyền" /><label>Loại quyền<input name="rightType" defaultValue="QUYỀN SỞ HỮU TÀI SẢN SINH HỌC" required /></label><label>Chủ thể quyền<input name="holder" required /></label><label>Hiệu lực từ<input name="validFrom" type="date" required /></label><button className="button primary" disabled={busy}>Lưu hồ sơ quyền</button></form>
  <form className="panel compact-form" onSubmit={(event) => void submit(event, `/assets/${asset.id}/custody`, (data) => ({ physicalCustodian: data.get("physicalCustodian"), location: data.get("location"), startAt: data.get("startAt"), status: "ACTIVE" }), "Đã cập nhật lưu ký") }><SectionHeader title="Ghi nhận lưu ký" /><label>Đơn vị giữ tài sản<input name="physicalCustodian" required /></label><label>Địa điểm<input name="location" required /></label><label>Bắt đầu<input name="startAt" type="date" required /></label><button className="button secondary" disabled={busy}>Cập nhật lưu ký</button></form>
  <form className="panel compact-form" onSubmit={(event) => void submit(event, `/assets/${asset.id}/care-agreements`, (data) => ({ caretakerOrganizationId: asset.organizationId, serviceTerms: data.get("serviceTerms"), careFrequency: data.get("careFrequency"), responsibility: data.get("responsibility"), riskAllocationSummary: data.get("riskAllocationSummary"), startsAt: data.get("startsAt"), currency: "VND" }), "Đã tạo thỏa thuận chăm sóc") }><SectionHeader title="Thỏa thuận chăm sóc" /><label>Điều khoản<textarea name="serviceTerms" required /></label><label>Tần suất<input name="careFrequency" required /></label><label>Trách nhiệm<textarea name="responsibility" required /></label><label>Phân bổ rủi ro<textarea name="riskAllocationSummary" required /></label><label>Bắt đầu<input name="startsAt" type="date" required /></label><button className="button secondary" disabled={busy}>Lưu thỏa thuận</button></form></div>{error ? <p className="form-error">{error}</p> : null}</div>;
  if (tab === "commerce") return <CommerceSection asset={asset} busy={busy} error={error} submit={submit} updateFulfillment={updateFulfillment} />;
  return <div className="two-columns"><section className="panel"><SectionHeader title="Sẵn sàng theo mục đích" description="Readiness là cổng điều kiện, không phải điểm tín dụng hay khuyến nghị đầu tư." icon={ShieldCheck} />{asset.readinessProfiles?.map((profile) => <article className="readiness-card" key={profile.purpose}><div><strong>{profile.purpose === "REAL_ASSET_TRANSFER" ? "Chuyển quyền tài sản thật" : "Rà soát tài chính"}</strong><StatusPill value={profile.status} /></div><ul>{profile.requirements.map((item) => <li key={item.key}>{item.met ? "✓" : "○"} {item.label}</li>)}</ul></article>)}<div className="card-actions"><button type="button" className="button secondary compact" disabled={busy} onClick={() => void requestReview("REAL_ASSET_TRANSFER")}>Gửi review chuyển quyền</button><button type="button" className="button secondary compact" disabled={busy} onClick={() => void requestReview("FINANCIAL_REVIEW")}>Gửi review tài chính</button></div>{error ? <p className="form-error">{error}</p> : null}</section><section className="panel"><SectionHeader title="Rủi ro tách biệt" description="Trust đo chất lượng hồ sơ; Risk phản ánh các tín hiệu bất lợi đang quan sát." />{asset.riskProfile ? <><div className="risk-hero"><strong>{asset.riskProfile.overallRisk}</strong><span>Rủi ro tổng hợp</span></div><dl className="detail-list"><dt>Sinh học</dt><dd>{asset.riskProfile.biologicalRisk}</dd><dt>Dịch bệnh</dt><dd>{asset.riskProfile.diseaseRisk}</dd><dt>Vị trí</dt><dd>{asset.riskProfile.locationRisk}</dd><dt>Chứng nhận</dt><dd>{asset.riskProfile.certificateRisk}</dd><dt>Lưu ký</dt><dd>{asset.riskProfile.custodyRisk}</dd><dt>Vận hành</dt><dd>{asset.riskProfile.operationalRisk}</dd></dl>{asset.riskProfile.reasons.map((reason) => <p key={reason} className="inline-note">{reason}</p>)}</> : <EmptyState title="Chưa tính rủi ro" description="Tính lại hồ sơ để tạo Risk Profile." />}</section></div>;
}

function CommerceSection({ asset, busy, error, submit, updateFulfillment }: {
  asset: Asset;
  busy: boolean;
  error: string;
  submit: (event: FormEvent<HTMLFormElement>, path: string, build: (data: FormData) => object, message: string) => Promise<void>;
  updateFulfillment: (requestId: string, status: "SCHEDULED" | "COMPLETED") => Promise<void>;
}) {
  const pending = asset.transactions?.filter((item) => item.status === "PURCHASE_REQUESTED" && item.offerId && item.buyerId) ?? [];
  const rightsDocuments = asset.evidence?.filter((item) => ["RIGHTS_DOCUMENT", "TRANSACTION_DOCUMENT"].includes(item.type)) ?? [];
  return <div className="two-columns">
    <section className="panel">
      <SectionHeader title="Giao dịch mua đứt" description="Không fractionalization, không NFT, không dự phóng ROI. Vòng đời giao dịch tách khỏi vòng đời sinh học." icon={HandCoins} />
      <dl className="detail-list"><dt>Trạng thái sinh học</dt><dd><StatusPill value={asset.currentStage} /></dd><dt>Trạng thái giao dịch</dt><dd><StatusPill value={asset.transactionStage} /></dd></dl>
      {asset.offers?.map((offer) => <article className="record-row" key={offer.id}><div><strong>{new Intl.NumberFormat("vi-VN").format(offer.askingPrice)} {offer.currency}</strong><span>{offer.careAfterSaleAvailable ? "Có chăm sóc sau bán" : "Không kèm chăm sóc"}</span></div><StatusPill value={offer.status} /></article>)}
      {asset.transactions?.map((transaction) => <article className="record-row" key={transaction.id}><div><strong>{transaction.buyer?.fullName ?? "Người mua"} · {transaction.status}</strong><span>Lưu ký sau bán: {transaction.custodyAfterSale}</span></div><StatusPill value={transaction.status} /></article>)}
      <h3>Thu hoạch / bàn giao</h3>
      {asset.fulfillmentRequests?.length ? asset.fulfillmentRequests.map((request) => <article className="record-row" key={request.id}><div><strong>{request.type}</strong><span>{request.status}{request.scheduledAt ? ` · ${new Date(request.scheduledAt).toLocaleString("vi-VN")}` : ""}</span></div>{request.status === "REQUESTED" ? <button type="button" className="button secondary compact" disabled={busy} onClick={() => void updateFulfillment(request.id, "SCHEDULED")}>Xác nhận lịch</button> : request.status === "SCHEDULED" ? <button type="button" className="button secondary compact" disabled={busy} onClick={() => void updateFulfillment(request.id, "COMPLETED")}>Hoàn tất</button> : <StatusPill value={request.status} />}</article>) : <p className="inline-note">Chưa có yêu cầu thu hoạch hoặc bàn giao.</p>}
    </section>
    <div className="page-stack">
      <form className="panel compact-form" onSubmit={(event) => void submit(event, `/assets/${asset.id}/offers`, (data) => ({ saleMode: "OUTRIGHT_PURCHASE", askingPrice: Number(data.get("askingPrice")), currency: "VND", careAfterSaleAvailable: data.get("care") === "on", careTermsSummary: data.get("careTermsSummary") || undefined }), "Đã công bố đề nghị mua đứt") }>
        <SectionHeader title="Tạo đề nghị bán" />
        <label>Giá đề nghị (VND)<input name="askingPrice" type="number" min="1" required /></label>
        <label className="checkbox-row"><input name="care" type="checkbox" /> Tiếp tục chăm sóc sau bán</label>
        <label>Tóm tắt điều khoản<textarea name="careTermsSummary" /></label>
        <button className="button primary" disabled={busy}>Công bố đề nghị</button>
      </form>
      {pending.length ? <form className="panel compact-form" onSubmit={(event) => void submit(event, `/assets/${asset.id}/transactions`, (data) => {
        const [offerId, buyerId] = String(data.get("purchaseRequest")).split("|");
        return { offerId, buyerId, rightsDocumentEvidenceId: data.get("rightsDocumentEvidenceId"), custodyAfterSale: data.get("custodyAfterSale"), notes: data.get("notes") || undefined };
      }, "Đã hoàn tất hồ sơ giao dịch") }>
        <SectionHeader title="Hoàn tất yêu cầu mua" description="Cần tài liệu chuyển quyền. Hoàn tất giao dịch không tự động thay đổi vòng đời sinh học hoặc người giữ tài sản." />
        <label>Yêu cầu mua<select name="purchaseRequest" required>{pending.map((transaction) => <option key={transaction.id} value={`${transaction.offerId}|${transaction.buyerId}`}>{transaction.buyer?.fullName ?? transaction.buyerId} · {new Intl.NumberFormat("vi-VN").format(transaction.price)} {transaction.currency}</option>)}</select></label>
        <label>Tài liệu quyền/giao dịch<select name="rightsDocumentEvidenceId" required defaultValue=""><option value="" disabled>Chọn bằng chứng</option>{rightsDocuments.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.verificationStatus}</option>)}</select></label>
        <label>Lưu ký sau bán<select name="custodyAfterSale"><option value="SELLER_OR_HTX">HTX tiếp tục chăm sóc</option><option value="BUYER">Bàn giao người mua</option></select></label>
        <label>Ghi chú<textarea name="notes" /></label>
        <button className="button primary" disabled={busy || rightsDocuments.length === 0}>Ghi nhận giao dịch hoàn tất</button>
        {!rightsDocuments.length ? <p className="inline-note">Hãy tải lên RIGHTS_DOCUMENT hoặc TRANSACTION_DOCUMENT trước khi hoàn tất.</p> : null}
      </form> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  </div>;
}
