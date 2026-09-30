import { ArrowRight, Eye, EyeOff, Leaf, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const user = await register({
        email: String(data.get("email")),
        password: String(data.get("password")),
        fullName: String(data.get("fullName")),
        phone: String(data.get("phone") || ""),
        role: "buyer",
      });
      navigate(`/${user.role}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đăng ký");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <section className="auth-side">
        <Link to="/" className="brand">
          <Leaf />
          GreenTrace
        </Link>
        <div>
          <p className="eyebrow">Bắt đầu từ tài sản thật</p>
          <h1>
            Tạo hồ sơ có cấu trúc, biết dữ liệu nào còn thiếu và ai có thể xác
            minh.
          </h1>
        </div>
      </section>
      <main className="auth-card">
        <div>
          <h2>Tạo tài khoản</h2>
          <p>Đăng ký công khai dành cho người mua. Các vai trò nghiệp vụ được quản trị viên cấp.</p>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              <span>Họ và tên <span className="required" aria-hidden="true">*</span></span>
              <span className="input-with-icon"><UserRound size={18} aria-hidden="true" /><input name="fullName" placeholder="Nhập họ và tên của bạn" required /></span>
            </label>
            <label>
              Số điện thoại
              <span className="input-with-icon"><Phone size={18} aria-hidden="true" /><input name="phone" type="tel" placeholder="Nhập số điện thoại" /></span>
            </label>
            <label>
              <span>Email <span className="required" aria-hidden="true">*</span></span>
              <span className="input-with-icon"><Mail size={18} aria-hidden="true" /><input name="email" type="email" placeholder="Nhập địa chỉ email" required /></span>
            </label>
            <label>
              <span>Mật khẩu <span className="required" aria-hidden="true">*</span></span>
              <span className="input-with-icon"><LockKeyhole size={18} aria-hidden="true" /><input name="password" type={showPassword ? "text" : "password"} minLength={10} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="password-hint" placeholder="Tạo mật khẩu" required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
              <span id="password-hint" className={password && password.length < 10 ? "field-help field-invalid" : "field-help"}>{password.length}/10 ký tự tối thiểu</span>
            </label>
          </div>
          <div className="inline-note"><ShieldCheck size={18} /><span><strong>Phân quyền an toàn:</strong> Operator, reviewer, verifier và admin chỉ được provision qua quản trị viên hoặc dữ liệu demo.</span></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary wide" disabled={busy}>
            {busy ? "Đang tạo…" : <>Tạo tài khoản <ArrowRight size={18} /></>}
          </button>
        </form>
        <p>
          Đã có tài khoản? <Link className="text-link" to="/login">Đăng nhập <ArrowRight size={15} /></Link>
        </p>
      </main>
    </div>
  );
}
