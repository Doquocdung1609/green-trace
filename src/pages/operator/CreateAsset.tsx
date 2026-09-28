import { MapPin, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../services/apiClient";
import type { Asset } from "../../types/domain";

export function CreateAsset() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
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
      const photo = data.get("photo");
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
    <div className="page-stack narrow">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Định danh tài sản</p>
          <h1>Đăng ký tài sản mới</h1>
          <p>
            Tạo hồ sơ REGISTERED. Việc đăng ký không chứng minh quyền sở hữu
            pháp lý hay giá trị tài chính.
          </p>
        </div>
      </div>
      <form className="panel asset-form" onSubmit={submit}>
        <section>
          <h2>Thông tin bắt buộc</h2>
          <div className="form-grid">
            <label>
              Tên hiển thị
              <input
                name="displayName"
                placeholder="Sâm Ngọc Linh lô A12"
                required
              />
            </label>
            <label>
              Loại tài sản
              <input
                name="assetType"
                defaultValue="Dược liệu lâu năm"
                required
              />
            </label>
            <label>
              Loài / giống
              <input
                name="species"
                defaultValue="Panax vietnamensis"
                required
              />
            </label>
            <label>
              Ngày trồng / tạo lập
              <input name="plantedAt" type="date" required />
            </label>
            <label className="full">
              Khu vực
              <input
                name="region"
                placeholder="Nam Trà My, Quảng Nam"
                required
              />
            </label>
            <label className="full">
              Mô tả
              <textarea name="description" rows={4} required />
            </label>
          </div>
        </section>
        <section>
          <h2>
            <MapPin size={19} /> Vị trí chính xác
          </h2>
          <p className="privacy-note">
            Tọa độ được lưu PRIVATE và không xuất hiện trong hộ chiếu công khai.
          </p>
          <div className="form-grid">
            <label>
              Vĩ độ
              <input name="latitude" type="number" step="any" required />
            </label>
            <label>
              Kinh độ
              <input name="longitude" type="number" step="any" required />
            </label>
          </div>
        </section>
        <section>
          <h2>
            <Upload size={19} /> Ảnh tài sản
          </h2>
          <label className="file-drop">
            <input
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
            <span>Chọn ảnh JPG, PNG hoặc WebP tối đa 10 MB</span>
          </label>
        </section>
        {error && <p className="form-error">{error}</p>}
        <button className="button primary" disabled={busy}>
          {busy ? "Đang tạo hồ sơ…" : "Tạo tài sản"}
        </button>
      </form>
    </div>
  );
}
