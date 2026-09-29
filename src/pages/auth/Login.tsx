import { ArrowRight, Eye, EyeOff, Leaf, LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("operator@greentrace.vn");
  const [password, setPassword] = useState("GreenTrace123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const user = await login(email, password);
      const intended = (location.state as { from?: string } | null)?.from;
      navigate(intended || `/${user.role}`, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Đăng nhập thất bại");
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
          <p className="eyebrow">Verify &amp; Prove before Finance</p>
          <h1>
            Mỗi hồ sơ tốt bắt đầu từ bằng chứng có nguồn và người xác minh rõ
            ràng.
          </h1>
        </div>
      </section>
      <main className="auth-card">
        <div>
          <h2>Đăng nhập</h2>
          <p>Truy cập không gian làm việc theo vai trò của bạn.</p>
        </div>
        <form onSubmit={submit}>
          <label>
            <span>Email <span className="required" aria-hidden="true">*</span></span>
            <span className="input-with-icon"><Mail size={18} aria-hidden="true" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></span>
          </label>
          <label>
            <span>Mật khẩu <span className="required" aria-hidden="true">*</span></span>
            <span className="input-with-icon"><LockKeyhole size={18} aria-hidden="true" /><input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button primary wide" disabled={busy}>
            {busy ? "Đang đăng nhập…" : <>Đăng nhập <ArrowRight size={18} /></>}
          </button>
        </form>
        <div className="demo-accounts">
          <strong>Tài khoản demo</strong>
          <button type="button" onClick={() => setEmail("operator@greentrace.vn")}>
            Operator
          </button>
          <button type="button" onClick={() => setEmail("verifier@greentrace.vn")}>
            Verifier
          </button>
          <button type="button" onClick={() => setEmail("reviewer@greentrace.vn")}>
            Reviewer
          </button>
          <button type="button" onClick={() => setEmail("buyer@greentrace.vn")}>
            Buyer
          </button>
        </div>
        <p>
          Chưa có tài khoản? <Link className="text-link" to="/register">Đăng ký tài khoản <ArrowRight size={15} /></Link>
        </p>
      </main>
    </div>
  );
}
