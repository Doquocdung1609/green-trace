import { Leaf } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
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
        role: data.get("role") as "operator" | "reviewer",
        organizationName: String(data.get("organizationName") || ""),
        region: String(data.get("region") || ""),
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
          <p>Verifier và admin được cấp quyền qua quản trị viên.</p>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label>
              Họ và tên
              <input name="fullName" required />
            </label>
            <label>
              Số điện thoại
              <input name="phone" />
            </label>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Mật khẩu
              <input name="password" type="password" minLength={10} required />
            </label>
            <label>
              Vai trò
              <select name="role">
                <option value="operator">Người quản lý tài sản</option>
                <option value="reviewer">Bên xem hồ sơ</option>
              </select>
            </label>
            <label>
              Tổ chức
              <input name="organizationName" />
            </label>
            <label className="full">
              Khu vực
              <input name="region" />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="button primary wide" disabled={busy}>
            {busy ? "Đang tạo…" : "Tạo tài khoản"}
          </button>
        </form>
        <p>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </main>
    </div>
  );
}
