import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/domain";
import { LoadingSkeleton } from "./ui/LoadingSkeleton";

export function ProtectedRoute({ roles }: { roles: UserRole[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSkeleton cards={3} label="Đang kiểm tra phiên đăng nhập" />;
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!roles.includes(user.role))
    return <Navigate to={`/${user.role}`} replace />;
  return <Outlet />;
}
