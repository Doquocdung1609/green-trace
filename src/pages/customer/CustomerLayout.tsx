import { Link, Outlet } from "react-router-dom";
import { LogOut, Leaf } from "lucide-react";
import { Button } from "../../components/ui/button";
import clsx from "clsx";
import { useAuth } from "../../contexts/AuthContext";

const CustomerLayout = () => {
  const { logout } = useAuth(); // Lấy hàm logout từ AuthContext

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

          {/* Navigation */}
          <nav className="flex items-center gap-6 font-medium text-gray-700 dark:text-gray-200">
            <Link to="/shop" className="hover:text-green-600 dark:hover:text-green-400">
              Cửa hàng
            </Link>
            <a
              href="https://magiceden.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-green-600 dark:hover:text-green-400"
            >
              Magic Eden
            </a>
            <Link to="/profile" className="hover:text-green-600 dark:hover:text-green-400">
              Hồ sơ
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={logout} // Sử dụng logout từ AuthContext
              className="flex items-center gap-2 border-gray-300 dark:border-gray-700 hover:border-red-500 hover:text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-4 h-4 group-hover:text-red-600" />
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