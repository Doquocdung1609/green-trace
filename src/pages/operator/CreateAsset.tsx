import { FileText, Info, Map, MapPin, Plus, Sprout, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useCallback, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../services/apiClient";
import type { Asset } from "../../types/domain";
import { FormSection } from "../../components/ui/FormSection";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../hooks/useToast";

const InteractiveAssetMap = lazy(() => import("../../components/ui/InteractiveAssetMap"));

export function CreateAsset() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [region, setRegion] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [commune, setCommune] = useState("");
  const [latitude, setLatitude] = useState<number>();
  const [longitude, setLongitude] = useState<number>();
  const [description, setDescription] = useState("");
  const [assetLevel, setAssetLevel] = useState("LOT");
  const { data: templateData } = useQuery({ queryKey: ["asset-templates"], queryFn: () => api.get<{ templates: { id: string; name: string; assetType: string }[] }>("/asset-templates") });
  const updateCoordinates = useCallback((nextLatitude?: number, nextLongitude?: number) => {
    setLatitude(nextLatitude);
    setLongitude(nextLongitude);
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const photo = data.get("photo");
    if (photo instanceof File && photo.size > 10 * 1024 * 1024) {
      setError("Ảnh tài sản không được vượt quá 10 MB.");
      setBusy(false);
      return;
    }
    try {
      const optional = (name: string) => String(data.get(name) ?? "").trim() || undefined;
      const optionalNumber = (name: string) => optional(name) ? Number(data.get(name)) : undefined;
      const result = await api.post<{ asset: Asset }>("/assets", {
        templateId: optional("templateId"), assetLevel, assetType: data.get("assetType"), species: data.get("species"), scientificName: optional("scientificName"), cultivar: optional("cultivar"), displayName: data.get("displayName"),
        propagationSource: optional("propagationSource"), propagationBatchCode: optional("propagationBatchCode"), formationMethod: optional("formationMethod"), plantedAt: data.get("plantedAt"), plantedAtConfidence: data.get("plantedAtConfidence"), ageBasis: data.get("ageBasis"),
        initialQuantity: optionalNumber("initialQuantity"), quantityUnit: optional("quantityUnit"), areaHectares: optionalNumber("areaHectares"), density: optionalNumber("density"),
        region: data.get("region"), province: optional("province"), district: optional("district"), commune: optional("commune"), elevationMeters: optionalNumber("elevationMeters"), spatialType: "POINT", growingAreaCode: optional("growingAreaCode"), geographicalIndication: optional("geographicalIndication"),
        caretaker: optional("caretaker"), managementBasis: optional("managementBasis"), description: data.get("description"), exactLatitude: Number(data.get("latitude")), exactLongitude: Number(data.get("longitude")),
      });
      if (photo instanceof File && photo.size > 0) {
        const upload = new FormData();
        upload.set("file", photo);
        upload.set("type", "PHOTO");
        upload.set("title", "Ảnh đăng ký ban đầu");
        upload.set("source", "Người quản lý tài sản");
        upload.set("sourceType", String(data.get("photoSourceType") || "OPERATOR"));
        upload.set("observedAt", new Date().toISOString());
        upload.set("visibility", "PUBLIC");
        await api.upload(`/assets/${result.asset.id}/evidence`, upload);
      }
      notify("Đã tạo hồ sơ tài sản", { description: `${result.asset.displayName} đã sẵn sàng để bổ sung bằng chứng.` });
      navigate(`/operator/assets/${result.asset.id}/evidence`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tạo tài sản",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-stack">
      <nav className="breadcrumb" aria-label="Đường dẫn trang"><Link to="/operator">Tổng quan</Link><span aria-hidden="true">/</span><span>Đăng ký tài sản</span></nav>
      <PageHeader eyebrow="Định danh tài sản" title="Đăng ký tài sản mới" description="Tạo hồ sơ tài sản để bắt đầu theo dõi, quản lý và xác thực trên GreenTrace." />
      <form className="asset-form" onSubmit={submit}>
        <div className="asset-form-main">
          <FormSection title="1. Định danh" description="Chọn mẫu, cấp tài sản và nhận diện nguồn sinh học." icon={FileText}>
            <div className="form-grid"><label>Mẫu tài sản<select name="templateId" defaultValue=""><option value="">Mặc định GreenTrace</option>{templateData?.templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Cấp tài sản<select name="assetLevel" value={assetLevel} onChange={(event) => setAssetLevel(event.target.value)}><option value="SINGLE_ASSET">Cá thể</option><option value="LOT">Lô</option><option value="PLOT">Thửa</option><option value="GROWING_AREA">Vùng trồng</option></select></label></div>
            <div className="form-grid">
              <label>Tên hiển thị <input name="displayName" placeholder="Sâm Ngọc Linh lô A12" required /></label>
              <label>Loại tài sản <input name="assetType" defaultValue="Dược liệu lâu năm" required /></label>
              <label>Loài <input name="species" defaultValue="Sâm Ngọc Linh" required /></label>
              <label>Tên khoa học <input name="scientificName" defaultValue="Panax vietnamensis" /></label>
              <label>Giống / cultivar <input name="cultivar" /></label>
              <label>Nguồn nhân giống <input name="propagationSource" required /></label>
              <label>Mã lô giống <input name="propagationBatchCode" /></label>
              <label>Phương thức hình thành <input name="formationMethod" placeholder="Gieo hạt / nuôi cấy…" /></label>
            </div>
          </FormSection>
          <FormSection title="2. Quy mô & thời gian" description="Ngày tạo lập và quy mô thay đổi theo cấp tài sản." icon={Sprout}>
            <div className="form-grid">
              <label>Ngày trồng / tạo lập <input name="plantedAt" type="date" required /></label>
              <label>Độ tin cậy ngày trồng<select name="plantedAtConfidence" defaultValue="DOCUMENTED"><option value="DOCUMENTED">Có tài liệu</option><option value="DECLARED">Khai báo</option><option value="ESTIMATED">Ước tính</option></select></label>
              <label>Cơ sở tuổi<select name="ageBasis" defaultValue="DOCUMENTED"><option value="DOCUMENTED">Tài liệu</option><option value="DECLARED">Khai báo</option><option value="ESTIMATED">Ước tính</option></select></label>
              {assetLevel === "SINGLE_ASSET" || assetLevel === "LOT" ? <><label>Số lượng ban đầu<input name="initialQuantity" type="number" min="0" step="any" /></label><label>Đơn vị<input name="quantityUnit" placeholder="cây / kg" /></label></> : null}
              {assetLevel !== "SINGLE_ASSET" ? <><label>Diện tích (ha)<input name="areaHectares" type="number" min="0" step="any" /></label><label>Mật độ<input name="density" type="number" min="0" step="any" /></label></> : null}
            </div>
          </FormSection>
          <FormSection title="3. Vị trí" description="Khu vực công khai và tọa độ chính xác được quản lý ở hai lớp riêng." icon={MapPin}>
            <div className="form-grid">
              <label className="full">Khu vực <input name="region" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Nam Trà My, Quảng Nam" required /></label>
              <label>Tỉnh<input name="province" value={province} onChange={(event) => setProvince(event.target.value)} /></label><label>Huyện<input name="district" value={district} onChange={(event) => setDistrict(event.target.value)} /></label><label>Xã<input name="commune" value={commune} onChange={(event) => setCommune(event.target.value)} /></label><label>Độ cao (m)<input name="elevationMeters" type="number" /></label><label>Mã vùng trồng<input name="growingAreaCode" /></label><label>Chỉ dẫn địa lý<input name="geographicalIndication" /></label>
              <label>Vĩ độ <input name="latitude" type="number" min="-90" max="90" step="any" value={latitude ?? ""} onChange={(event) => setLatitude(event.target.value ? Number(event.target.value) : undefined)} placeholder="15.2853" required /></label>
              <label>Kinh độ <input name="longitude" type="number" min="-180" max="180" step="any" value={longitude ?? ""} onChange={(event) => setLongitude(event.target.value ? Number(event.target.value) : undefined)} placeholder="108.0089" required /></label>
            </div>
            <p className="privacy-note"><Info size={17} /> Tọa độ chính xác được lưu PRIVATE và không xuất hiện trong hộ chiếu công khai.</p>
            {import.meta.env.DEV && assetLevel !== "SINGLE_ASSET" ? <p className="inline-note">Ranh giới polygon đã có trường dữ liệu nền; công cụ vẽ ranh giới sẽ được bổ sung ở bản phát triển tiếp theo.</p> : null}
          </FormSection>
          <FormSection title="4. Quản lý & mô tả" description="Ai chăm sóc, theo căn cứ nào và trong phạm vi trách nhiệm nào." icon={Sprout}>
            <div className="form-grid"><label>Đơn vị / người chăm sóc<input name="caretaker" /></label><label>Cơ sở quản lý<input name="managementBasis" placeholder="Hợp đồng, giao khoán…" /></label></div>
            <label>Mô tả <textarea name="description" rows={5} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả điều kiện sinh trưởng, diện tích và đặc điểm của tài sản…" required /><span className="field-help">{description.length}/500 ký tự</span></label>
          </FormSection>
          <FormSection title="5. Ảnh & nguồn bằng chứng" description="Ảnh ban đầu tạo bằng chứng vận hành; policy hệ thống quyết định có cần verifier hay không." icon={Upload}>
            <label>Nguồn ảnh<select name="photoSourceType" defaultValue="OPERATOR"><option value="OPERATOR">Người vận hành</option><option value="DEVICE">Thiết bị / camera</option><option value="THIRD_PARTY">Bên thứ ba</option><option value="DOCUMENT">Tài liệu</option></select></label>
            <label className="file-drop"><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required /><span>Chụp hoặc chọn ảnh JPG, PNG, WebP tối đa 10 MB</span></label>
          </FormSection>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </div>
        <aside className="asset-form-aside">
          <FormSection title="Vị trí trên bản đồ" description="Tìm kiếm, nhấp bản đồ hoặc kéo marker để chọn tọa độ." icon={Map}>
            <Suspense fallback={<div className="map-card map-component-loading" role="status">Đang tải thành phần bản đồ…</div>}>
              <InteractiveAssetMap region={region} latitude={latitude} longitude={longitude} onRegionChange={setRegion} onAddressChange={(address) => { setRegion(address.region); setProvince(address.province); setDistrict(address.district); setCommune(address.commune); }} onCoordinatesChange={updateCoordinates} />
            </Suspense>
          </FormSection>
          <div className="asset-form-actions"><button className="button primary wide" disabled={busy}>{busy ? "Đang tạo hồ sơ…" : <><Plus size={18} /> Tạo hồ sơ</>}</button></div>
        </aside>
      </form>
    </div>
  );
}
