import {
  ArrowRight,
  CheckCircle2,
  Database,
  FileCheck2,
  Fingerprint,
  Leaf,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { Link } from "react-router-dom";

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
  return (
    <div className="public-page">
      <header className="public-nav">
        <Link to="/" className="brand">
          <Leaf />
          <span>GreenTrace</span>
        </Link>
        <nav>
          <a href="#how">Cách hoạt động</a>
          <a href="#trust">Mô hình tin cậy</a>
          <Link to="/passport/GT-NL-2026-000128">Hộ chiếu mẫu</Link>
        </nav>
        <div>
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
            <div className="passport-preview">
              <div className="preview-head">
                <span>GT</span>
                <div>
                  <small>HỘ CHIẾU TÀI SẢN SỐ</small>
                  <strong>Sâm Ngọc Linh</strong>
                </div>
                <span className="verified-dot">✓</span>
              </div>
              <div className="score-ring">
                <div>
                  <strong>82</strong>
                  <span>/100</span>
                </div>
              </div>
              <p>Điểm tin cậy hồ sơ</p>
              <div className="preview-row">
                <Fingerprint />
                <span>Định danh</span>
                <strong>20/20</strong>
              </div>
              <div className="preview-row">
                <Database />
                <span>Bằng chứng</span>
                <strong>17/20</strong>
              </div>
              <div className="preview-row">
                <FileCheck2 />
                <span>Xác minh</span>
                <strong>21/30</strong>
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
