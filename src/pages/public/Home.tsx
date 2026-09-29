import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileCheck2,
  Fingerprint,
  Leaf,
  Menu,
  ShieldCheck,
  Waypoints,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { TrustScore } from "../../components/ui/TrustScore";
import { api } from "../../services/apiClient";
import type { Asset } from "../../types/domain";

const layers = [
  [
    "01",
    "Định danh tài sản",
    "Mã duy nhất, chủ thể quản lý, vùng và mốc tạo lập.",
  ],
  [
    "02",
    "Kho bằng chứng",
    "Ảnh, vị trí, nhật ký, IoT, chứng nhận và kiểm nghiệm.",
  ],
  [
    "03",
    "Xác minh độc lập",
    "Mỗi người xác nhận đúng phạm vi và chịu trách nhiệm cho chữ ký.",
  ],
  [
    "04",
    "Sổ vòng đời",
    "Trạng thái chỉ đổi khi có bằng chứng và quy tắc phù hợp.",
  ],
  [
    "05",
    "Hồ sơ tin cậy",
    "Điểm có diễn giải, độ mới và các bất thường cần kiểm tra.",
  ],
  [
    "06",
    "Hộ chiếu tài sản số",
    "Bản tổng hợp có phiên bản để đối tác bắt đầu thẩm định.",
  ],
];

export function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: sampleData } = useQuery({
    queryKey: ["home-sample-passport"],
    queryFn: () => api.get<{ asset: Asset }>("/public/passports/GT-NL-2026-000128"),
    retry: false,
  });
  const sample = sampleData?.asset;
  const trust = sample?.trustProfile;
  return (
    <div className="public-page">
      <header className="public-nav">
        <Link to="/" className="brand">
          <Leaf />
          <span>GreenTrace</span>
        </Link>
        <button className="public-menu" type="button" aria-label={menuOpen ? "Đóng menu" : "Mở menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((current) => !current)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav className={menuOpen ? "open" : ""} aria-label="Điều hướng chính">
          <a href="#how" onClick={() => setMenuOpen(false)}>Cách hoạt động</a>
          <a href="#trust" onClick={() => setMenuOpen(false)}>Mô hình tin cậy</a>
          <Link to="/passport/GT-NL-2026-000128" onClick={() => setMenuOpen(false)}>Hộ chiếu mẫu</Link>
          <a href="#about" onClick={() => setMenuOpen(false)}>Về chúng tôi</a>
        </nav>
        <div className="public-nav-actions">
          <Link className="button secondary" to="/login">
            Đăng nhập
          </Link>
          <Link className="button primary" to="/register">
            Đăng ký
          </Link>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <ShieldCheck size={16} /> Hạ tầng xác minh trước tài chính hóa
            </p>
            <h1>
              Biến bằng chứng rời rạc thành{" "}
              <em>hồ sơ tài sản có thể kiểm tra</em>
            </h1>
            <p>
              GreenTrace giúp trả lời tài sản nào, ở đâu, ai quản lý, bằng chứng
              nào mô tả vòng đời, ai đã xác minh và hồ sơ hiện đủ tin cậy đến
              đâu.
            </p>
            <div className="hero-actions">
              <Link className="button primary" to="/login">
                Vào hệ thống <ArrowRight size={18} />
              </Link>
              <Link className="text-link" to="/passport/GT-NL-2026-000128">
                Xem hộ chiếu mẫu
              </Link>
            </div>
            <div className="hero-proof">
              <span>
                <CheckCircle2 /> Không cần ví để xem hộ chiếu công khai
              </span>
              <span>
                <CheckCircle2 /> Không phát hành token trong MVP
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <Leaf className="hero-leaf" aria-hidden="true" />
            <div className="passport-preview">
              <div className="preview-head">
                <img src={sample?.photoUrl || "/assets/demo/ginseng-field.svg"} alt={sample ? `Ảnh ${sample.displayName}` : "Ảnh minh họa tài sản nông nghiệp"} />
                <div>
                  <small>HỘ CHIẾU TÀI SẢN SỐ</small>
                  <strong>{sample?.displayName || "Hộ chiếu tài sản mẫu"}</strong>
                  <span className="muted">{sample?.assetCode || "Đang tải dữ liệu…"}</span>
                </div>
                <span className="verified-dot" aria-label={sample?.passportStatus === "READY_FOR_REVIEW" ? "Sẵn sàng xem xét" : "Hồ sơ đang được kiểm tra"}>{sample?.passportStatus === "READY_FOR_REVIEW" ? "✓" : "•"}</span>
              </div>
              {trust ? <TrustScore score={trust.totalScore} /> : <div className="preview-score-loading" role="status">Đang tải điểm tin cậy…</div>}
              <div className="preview-row">
                <Fingerprint />
                <span>Định danh</span>
                <strong>{trust ? `${trust.identityScore}/20` : "—"}</strong>
              </div>
              <div className="preview-row">
                <Database />
                <span>Bằng chứng</span>
                <strong>{trust ? `${trust.evidenceScore}/20` : "—"}</strong>
              </div>
              <div className="preview-row">
                <FileCheck2 />
                <span>Xác minh</span>
                <strong>{trust ? `${trust.verificationScore}/30` : "—"}</strong>
              </div>
              <div className="readiness">
                <span>Sẵn sàng để đối tác tài chính bắt đầu xem xét</span>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="section">
          <p className="eyebrow">Quy trình sản phẩm</p>
          <h2>Bằng chứng và người xác minh đi trước blockchain</h2>
          <div className="layer-grid">
            {layers.map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="trust" className="trust-section">
          <div>
            <p className="eyebrow">
              <Waypoints size={16} /> Nguyên tắc oracle
            </p>
            <h2>
              Blockchain bảo vệ lịch sử, không biến khai báo thành sự thật
            </h2>
            <p>
              Mỗi kết luận luôn truy ngược được về claim, bằng chứng, nguồn,
              người xác minh, phạm vi xác nhận, hash và chữ ký.
            </p>
          </div>
          <ol>
            <li>Claim</li>
            <li>Evidence</li>
            <li>Independent verification</li>
            <li>Attestation</li>
            <li>Hash + signature</li>
            <li>Blockchain integrity</li>
          </ol>
        </section>
        <section id="about" className="section">
          <p className="eyebrow"><FileCheck2 size={16} /> Hộ chiếu mẫu</p>
          <h2>Xem cách một hồ sơ tài sản thực tế được trình bày</h2>
          <p className="muted">Khám phá cấu trúc dữ liệu, điểm tin cậy, bằng chứng, cảnh báo và lịch sử blockchain của hồ sơ minh họa.</p>
          <Link className="button primary" to="/passport/GT-NL-2026-000128">Xem hộ chiếu mẫu <ArrowRight size={17} /></Link>
        </section>
      </main>
      <footer className="public-footer">
        <span>© 2026 GreenTrace</span>
        <p>
          Không xác nhận quyền sở hữu pháp lý, không định giá, không chấm điểm
          tín dụng và không đưa ra khuyến nghị đầu tư.
        </p>
      </footer>
    </div>
  );
}
