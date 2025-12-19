import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./button";
import { Moon, Sun, Leaf } from "lucide-react";
import clsx from "clsx";

const Header = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={clsx(
        "fixed top-0 left-0 w-full z-50 backdrop-blur-md transition-all duration-300",
        scrolled
          ? "bg-white/90 dark:bg-gray-900/90 shadow-md"
          : "bg-white/80 dark:bg-gray-900/80"
      )}
    >

      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-green-600 dark:text-green-400">
          <Leaf className="w-6 h-6" />
          GreenTrace
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex gap-8 font-medium text-gray-700 dark:text-gray-200">
          {[
            { to: "/", label: "Trang chủ", external: false },
            { to: "/about", label: "Giới thiệu", external: false },
            { to: "/contact", label: "Liên hệ", external: false },
          ].map((link) =>
            link.external ? (
              <a
                key={link.to}
                href={link.to}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-all hover:text-green-600 dark:hover:text-green-400"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.to}
                to={link.to}
                className={clsx(
                  "transition-all hover:text-green-600 dark:hover:text-green-400",
                  location.pathname === link.to && "text-green-600 dark:text-green-400 font-semibold"
                )}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>


        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="outline" className="rounded-full px-4">Đăng nhập</Button>
          </Link>
          <Link to="/register">
            <Button className="bg-green-600 hover:bg-green-700 rounded-full text-white px-4">
              Đăng ký
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
