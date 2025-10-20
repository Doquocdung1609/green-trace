import React from "react";
import { Link } from "react-router-dom";
import { LogOut, Leaf } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";

const DashboardLayout = ({ children, role }: { children: React.ReactNode; role: string }) => {
  const { logout } = useAuth(); // Lấy hàm logout từ AuthContext

  const links =
    role === "farmer"
      ? [
          { path: "/farmer/dashboard", label: "Tổng quan" },
          { path: "/farmer/products", label: "Sản phẩm" },
          { path: "/farmer/profile", label: "Hồ sơ" },
        ]
      : [];

  return (
    <div className="flex h-screen bg-gradient-to-br from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      <aside className="w-64 bg-green-700 text-white p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Leaf className="w-6 h-6 text-white" />
            <h2 className="text-2xl font-bold">GreenTrace</h2>
          </div>
          <nav className="space-y-2">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="block px-4 py-2 rounded-lg hover:bg-green-600 transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <Button
          onClick={logout} // Sử dụng logout từ AuthContext
          variant="destructive"
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600"
        >
          <LogOut /> Đăng xuất
        </Button>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
};

export default DashboardLayout;