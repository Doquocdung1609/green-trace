import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "../../services/api";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Link } from "react-router-dom";
import { Filter, Tag, Star } from "lucide-react";
import ProductCard from "../../components/ui/ProductCard"; // ✅ Dùng card từ trang Home

const Shop = () => {
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ["shopProducts"],
    queryFn: fetchProducts,
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // ✅ Lọc và tìm kiếm
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        category === "" ||
        (category === "Trái cây" &&
          ["xoài", "sầu riêng", "thanh long", "chôm chôm"].some((k) =>
            p.name.toLowerCase().includes(k)
          )) ||
        (category === "Rau củ" &&
          ["rau", "bắp cải", "cà rốt"].some((k) =>
            p.name.toLowerCase().includes(k)
          )) ||
        (category === "Cà phê" && p.name.toLowerCase().includes("cà phê"));
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const featuredProducts = useMemo(() => products.slice(0, 3), [products]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 transition-all">
      {/* Hero Section */}
      <section className="relative bg-green-600 text-white text-center py-20 shadow-md">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-25"></div>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-5xl font-bold drop-shadow-lg"
        >
          Cửa hàng nông sản
        </motion.h1>
        <p className="relative text-lg mt-3 opacity-90">
          Khám phá và mua sắm các sản phẩm tươi sạch trực tiếp từ nông trại Việt 🌾
        </p>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-8">
        {/* Bộ lọc bên trái */}
        <aside className="md:w-1/4 w-full flex flex-col gap-6">
          {/* Bộ lọc */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-green-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-green-600 mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5" /> Bộ lọc
            </h2>

            <Input
              placeholder="🔍 Tìm sản phẩm..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="mb-4"
            />

            <label className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 mb-2">
              <Tag className="w-4 h-4" /> Loại sản phẩm
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border rounded-lg p-2 mb-2 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tất cả</option>
              <option value="Trái cây">Trái cây</option>
              <option value="Rau củ">Rau củ</option>
              <option value="Cà phê">Cà phê</option>
            </select>
          </div>

          {/* Sản phẩm nổi bật */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-green-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-green-600 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" /> Sản phẩm nổi bật
            </h2>
            <div className="space-y-4">
              {featuredProducts.map((fp) => (
                <Link
                  to={`/product/${fp.id}`}
                  key={fp.id}
                  className="flex items-center gap-3 bg-green-50 dark:bg-gray-700 p-2 rounded-lg hover:bg-green-100 dark:hover:bg-gray-600 transition"
                >
                  <img
                    src={fp.image}
                    alt={fp.name}
                    className="w-14 h-14 object-cover rounded-md"
                  />
                  <div>
                    <p className="text-sm font-semibold">{fp.name}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {fp.price.toLocaleString("vi-VN")} VNĐ /kg
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* Khu vực sản phẩm chính */}
        <main className="flex-1">
          <h2 className="text-3xl font-bold mb-6 text-green-700 dark:text-green-400">
            Danh sách sản phẩm
          </h2>

          {isLoading ? (
            <p className="text-center text-gray-500">Đang tải sản phẩm...</p>
          ) : isError ? (
            <p className="text-center text-red-500">Không thể tải sản phẩm 😢</p>
          ) : paginatedProducts.length === 0 ? (
            <p className="text-center text-gray-600">
              Không tìm thấy sản phẩm phù hợp.
            </p>
          ) : (
            <>
              {/* ✅ Thay phần card cũ bằng ProductCard như ở Home */}
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.15 }}
              >
                {paginatedProducts.map((product) => (
                  <motion.div key={product.id}>
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              <div className="flex justify-center items-center gap-3 mt-10">
                <Button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  ← Trước
                </Button>
                <span className="font-semibold">
                  Trang {currentPage} / {totalPages}
                </span>
                <Button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  Sau →
                </Button>
              </div>
            </>
          )}
        </main>
      </section>
    </div>
  );
};

export default Shop;
