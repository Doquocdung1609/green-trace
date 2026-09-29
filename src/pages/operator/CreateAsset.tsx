import { FileText, Info, Map, MapPin, Plus, Sprout, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../services/apiClient";
import type { Asset } from "../../types/domain";
import { FormSection } from "../../components/ui/FormSection";
import { MapCard } from "../../components/ui/MapCard";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../hooks/useToast";

export function CreateAsset() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [region, setRegion] = useState("");
  const [latitude, setLatitude] = useState<number>();
  const [longitude, setLongitude] = useState<number>();
  const [description, setDescription] = useState("");
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
      const result = await api.post<{ asset: Asset }>("/assets", {
        assetType: data.get("assetType"),
        species: data.get("species"),
        displayName: data.get("displayName"),
        organizationId: data.get("organizationId") || undefined,
        region: data.get("region"),
        plantedAt: data.get("plantedAt"),
        description: data.get("description"),
        exactLatitude: Number(data.get("latitude")),
        exactLongitude: Number(data.get("longitude")),
      });
      if (photo instanceof File && photo.size > 0) {
        const upload = new FormData();
        upload.set("file", photo);
        upload.set("type", "PHOTO");
        upload.set("title", "Ảnh đăng ký ban đầu");
        upload.set("source", "Người quản lý tài sản");
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
          <FormSection title="Thông tin bắt buộc" description="Các thông tin cơ bản để xác định và phân loại tài sản." icon={FileText}>
            <div className="form-grid">
              <label>Tên hiển thị <input name="displayName" placeholder="Sâm Ngọc Linh lô A12" required /></label>
              <label>Loại tài sản <input name="assetType" defaultValue="Dược liệu lâu năm" required /></label>
              <label>Loài / giống <input name="species" defaultValue="Panax vietnamensis" required /></label>
              <label>Ngày trồng / tạo lập <input name="plantedAt" type="date" required /></label>
            </div>
          </FormSection>
          <FormSection title="Vị trí & khu vực" description="Xác định vị trí địa lý và khu vực quản lý của tài sản." icon={MapPin}>
            <div className="form-grid">
              <label className="full">Khu vực <input name="region" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Nam Trà My, Quảng Nam" required /></label>
              <label>Vĩ độ <input name="latitude" type="number" min="-90" max="90" step="any" value={latitude ?? ""} onChange={(event) => setLatitude(event.target.value ? Number(event.target.value) : undefined)} placeholder="15.2853" required /></label>
              <label>Kinh độ <input name="longitude" type="number" min="-180" max="180" step="any" value={longitude ?? ""} onChange={(event) => setLongitude(event.target.value ? Number(event.target.value) : undefined)} placeholder="108.0089" required /></label>
            </div>
            <p className="privacy-note"><Info size={17} /> Tọa độ chính xác được lưu PRIVATE và không xuất hiện trong hộ chiếu công khai.</p>
          </FormSection>
          <FormSection title="Quản lý & mô tả" description="Bổ sung thông tin mô tả để quản lý tài sản tốt hơn." icon={Sprout}>
            <label>Mô tả <textarea name="description" rows={5} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả điều kiện sinh trưởng, diện tích và đặc điểm của tài sản…" required /><span className="field-help">{description.length}/500 ký tự</span></label>
          </FormSection>
          <FormSection title="Ảnh tài sản" description="Ảnh ban đầu được tạo thành bằng chứng PHOTO." icon={Upload}>
            <label className="file-drop"><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" required /><span>Chọn ảnh JPG, PNG hoặc WebP tối đa 10 MB</span></label>
          </FormSection>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </div>
        <aside className="asset-form-aside">
          <FormSection title="Vị trí trên bản đồ" description="Bản xem trước dựa trên dữ liệu bạn nhập." icon={Map}>
            <MapCard region={region} latitude={latitude} longitude={longitude} />
          </FormSection>
          <div className="asset-form-actions"><button className="button primary wide" disabled={busy}>{busy ? "Đang tạo hồ sơ…" : <><Plus size={18} /> Tạo hồ sơ</>}</button></div>
        </aside>
      </form>
    </div>
  );
}
