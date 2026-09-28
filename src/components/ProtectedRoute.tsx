import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/domain";

export function ProtectedRoute({ roles }: { roles: UserRole[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return <div className="page-state">Đang kiểm tra phiên đăng nhập…</div>;
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!roles.includes(user.role))
    return <Navigate to={`/${user.role}`} replace />;
  return <Outlet />;
}
