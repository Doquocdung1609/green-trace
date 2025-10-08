import React from "react";
import { Link, useNavigate, Outlet } from "react-router-dom";
import { ShoppingCart, LogOut } from "lucide-react";
import { Button } from "../../components/ui/button";
import { mockLogout } from "../../services/mockAuth";

const CustomerLayout = () => {
  const navigate = useNavigate();

  const logout = () => {
    mockLogout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md shadow-md z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-3">
          <Link to="/shop" className="text-2xl font-bold text-green-700">
            🌿 GreenTrace
          </Link>

          <nav className="flex items-center gap-4 text-gray-700">
            <Link to="/shop" className="hover:text-green-600">
              Cửa hàng
            </Link>
            <Link to="/orders" className="hover:text-green-600">
              Đơn hàng
            </Link>
            <Link to="/profile" className="hover:text-green-600">
              Hồ sơ
            </Link>
            <Link
              to="/cart"
              className="hover:text-green-600 flex items-center gap-1"
            >
              <ShoppingCart className="w-5 h-5" /> Giỏ hàng
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Đăng xuất
            </Button>
          </nav>
        </div>
      </header>

      {/* NỘI DUNG */}
      <main className="flex-1 pt-24 pb-10 px-6">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="text-center py-4 border-t text-sm text-gray-500 dark:text-gray-400">
        © 2025 GreenTrace. All rights reserved.
      </footer>
    </div>
  );
};

export default CustomerLayout;
