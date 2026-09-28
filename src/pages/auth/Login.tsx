import { Leaf } from "lucide-react";
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
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="button primary wide" disabled={busy}>
            {busy ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
        <div className="demo-accounts">
          <strong>Tài khoản demo</strong>
          <button onClick={() => setEmail("operator@greentrace.vn")}>
            Operator
          </button>
          <button onClick={() => setEmail("verifier@greentrace.vn")}>
            Verifier
          </button>
          <button onClick={() => setEmail("reviewer@greentrace.vn")}>
            Reviewer
          </button>
        </div>
        <p>
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
      </main>
    </div>
  );
}
