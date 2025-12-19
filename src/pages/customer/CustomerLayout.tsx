import { Link, Outlet, useLocation } from "react-router-dom";
import { LogOut, Leaf, ShoppingCart, Receipt, Package } from "lucide-react";
import { Button } from "../../components/ui/button";
import clsx from "clsx";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect, useState } from "react";

const CustomerLayout = () => {
  const { logout } = useAuth();
  const location = useLocation();

  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem("cart") || "[]");
      const count = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);
      setCartCount(count);
    };

    updateCartCount();
    window.addEventListener("cartUpdated", updateCartCount);

    return () => {
      window.removeEventListener("cartUpdated", updateCartCount);
    };
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 transition-all">
      {/* HEADER */}
      <header
        className={clsx(
          "fixed top-0 left-0 w-full z-50 backdrop-blur-md transition-all duration-300 shadow-md bg-white/90 dark:bg-gray-900/90"
        )}
      >
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 text-2xl font-bold text-green-600 dark:text-green-400"
          >
            <Leaf className="w-6 h-6" /> GreenTrace
          </Link>

          {/* Navigation - dành cho Nhà đầu tư (customer) */}
          <nav className="flex items-center gap-6 font-medium text-gray-700 dark:text-gray-200">
            <Link
              to="/shop"
              className={clsx(
                "hover:text-green-600 dark:hover:text-green-400 transition-colors",
                isActive("/shop") && "text-green-600 dark:text-green-400 font-semibold"
              )}
            >
              Cửa hàng
            </Link>

            <Link
              to="/cart"
              className={clsx(
                "flex items-center gap-2 hover:text-green-600 dark:hover:text-green-400 transition-colors relative",
                isActive("/cart") && "text-green-600 dark:text-green-400 font-semibold"
              )}
            >
              <ShoppingCart className="w-5 h-5" />
              Giỏ hàng
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link
              to="/checkout"
              className={clsx(
                "flex items-center gap-2 hover:text-green-600 dark:hover:text-green-400 transition-colors",
                isActive("/checkout") && "text-green-600 dark:text-green-400 font-semibold"
              )}
            >
              <Receipt className="w-5 h-5" />
              Thanh toán
            </Link>

            <Link
              to="/orders"
              className={clsx(
                "flex items-center gap-2 hover:text-green-600 dark:hover:text-green-400 transition-colors",
                isActive("/orders") && "text-green-600 dark:text-green-400 font-semibold"
              )}
            >
              <Package className="w-5 h-5" />
              Đơn hàng
            </Link>

            <Link
              to="/profile"
              className={clsx(
                "hover:text-green-600 dark:hover:text-green-400 transition-colors",
                isActive("/profile") && "text-green-600 dark:text-green-400 font-semibold"
              )}
            >
              Hồ sơ
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex items-center gap-2 border-gray-300 dark:border-gray-700 hover:border-red-500 hover:text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </Button>
          </nav>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 pt-[65px]">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="bg-green-600 text-white text-center py-4 mt-auto dark:bg-green-700">
        © 2025 GreenTrace — Minh bạch nông sản Việt Nam 🌾
      </footer>
    </div>
  );
};

export default CustomerLayout;