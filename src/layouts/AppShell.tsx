import {
  ClipboardCheck,
  FileSignature,
  FileBadge,
  Gauge,
  Leaf,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Sprout,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { WalletStatus } from "../components/ui/WalletStatus";
import { useAuth } from "../hooks/useAuth";
import { SAMPLE_PASSPORT_PATH } from "../lib/demoData";
import { roleLabels, type UserRole } from "../types/domain";

const navByRole: Record<
  UserRole,
  { to: string; label: string; icon: typeof Gauge }[]
> = {
  operator: [
    { to: "/operator", label: "Tổng quan", icon: Gauge },
    { to: "/operator/assets/new", label: "Đăng ký tài sản", icon: Sprout },
  ],
  verifier: [
    { to: "/verifier", label: "Tổng quan", icon: Gauge },
    {
      to: "/verifier/requests",
      label: "Yêu cầu xác minh",
      icon: ClipboardCheck,
    },
    { to: "/verifier/attestations", label: "Attestation đã ký", icon: FileSignature },
  ],
  reviewer: [{ to: "/reviewer", label: "Hồ sơ thẩm định", icon: Search }],
  admin: [{ to: "/admin", label: "Quản trị", icon: Settings }],
  buyer: [{ to: "/my-assets", label: "Tài sản của tôi", icon: Sprout }],
};

export function AppShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  return (
    <div className="app-shell">
      {open ? <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Đóng menu điều hướng" /> : null}
      <aside className={open ? "sidebar sidebar-open" : "sidebar"}>
        <div className="brand">
          <Leaf />
          <span>GreenTrace</span>
        </div>
        <button
          className="mobile-close"
          onClick={() => setOpen(false)}
          aria-label="Đóng menu"
        >
          <X />
        </button>
        <div className="user-card">
          <div className="avatar">{user.fullName.charAt(0)}</div>
          <div>
            <strong>{user.fullName}</strong>
            <span>{roleLabels[user.role]}</span>
          </div>
        </div>
        <nav>
          {navByRole[user.role].map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to.split("/").length === 2}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
          <NavLink to={SAMPLE_PASSPORT_PATH}>
            <FileBadge size={18} />
            Hộ chiếu mẫu
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={18} />
          <p>
            Blockchain ghi nhận hash và chữ ký, không tự xác nhận tài sản ngoài
            đời.
          </p>
        </div>
        <button className="logout-button" onClick={() => void logout()}>
          <LogOut size={18} />
          Đăng xuất
        </button>
      </aside>
      <div className="shell-content">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setOpen(true)}
            aria-label="Mở menu"
            aria-expanded={open}
          >
            <Menu />
          </button>
          <div className="topbar-copy">
            <strong>Verify &amp; Prove before Finance</strong>
            <span>Hạ tầng hồ sơ tin cậy cho tài sản nông nghiệp</span>
          </div>
          <WalletStatus />
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
