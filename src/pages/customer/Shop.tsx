import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "../../services/api";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Link } from "react-router-dom";
import { Filter, Tag, Star, Package, Cloud } from "lucide-react";
import ProductCard from "../../components/ui/ProductCard";
import type { Product } from "../../types/types";

const Shop = () => {
  const { data: products = [], isLoading: isLoadingProducts, isError: isErrorProducts } = useQuery({
    queryKey: ["shopProducts"],
    queryFn: fetchProducts,
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [contentType, setContentType] = useState<"Products">("Products");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Kiểm tra xem có đang sử dụng bộ lọc không
  const isUsingFilter = search !== "" || category !== "";

  // Lọc và tìm kiếm cho Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        category === "" ||
        (category === "Sâm" &&
          ["sâm ngọc linh", "nhân sâm"].some((k) =>
            p.name.toLowerCase().includes(k)
          )) ||
        (category === "Nấm" &&
          ["nấm linh chi", "đông trùng hạ thảo"].some((k) =>
            p.name.toLowerCase().includes(k)
          )) ||
        (category === "Cây cảnh" &&
          ["bonsai tùng", "mai vàng", "lan phi điệp"].some((k) =>
            p.name.toLowerCase().includes(k)
          )) ||
        (category === "Trầm hương" &&
          ["trầm hương", "kỳ nam"].some((k) =>
            p.name.toLowerCase().includes(k)
          ));
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  // Phân trang - chỉ áp dụng khi có bộ lọc
  const productsTotalPages = isUsingFilter ? Math.ceil(filteredProducts.length / itemsPerPage) : 1;

  const productsStartIndex = (currentPage - 1) * itemsPerPage;

  const paginatedProducts = isUsingFilter
    ? filteredProducts.slice(productsStartIndex, productsStartIndex + itemsPerPage)
    : filteredProducts;

  // Sản phẩm nổi bật - luôn hiển thị cả Products
  const featuredProducts = useMemo(() => products.slice(0, 3), [products]);

  // Xác định loại item để render
  const getItemType = (item: Product): "Product" => {
    return "price" in item ? "Product" : "Product";
  };

  // Render section cho Products
  const renderProductsSection = () => {
    const productsToShow = isUsingFilter ? paginatedProducts : filteredProducts;
    const productsCount = isUsingFilter ? filteredProducts.length : products.length;
    const productsPages = isUsingFilter ? productsTotalPages : 1;

    return (
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
            <Package className="w-6 h-6" /> Tài sản sinh học cao cấp
          </h2>
          {isUsingFilter && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {productsCount} kết quả
            </div>
          )}
        </div>

        {(isLoadingProducts) ? (
          <p className="text-center text-gray-500">Đang tải tài sản...</p>
        ) : (isErrorProducts) ? (
          <p className="text-center text-red-500">Không thể tải tài sản 😢</p>
        ) : productsToShow.length === 0 ? (
          <p className="text-center text-gray-600">Không tìm thấy tài sản phù hợp.</p>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.15 }}
            >
              {productsToShow.map((product) => (
                <motion.div key={product.id}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination cho Products */}
            {isUsingFilter && productsPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-10">
                <Button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  ← Trước
                </Button>
                <span className="font-semibold">
                  Trang {currentPage} / {productsPages}
                </span>
                <Button
                  disabled={currentPage === productsPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="bg-green-600 text-white hover:bg-green-700"
                >
                  Sau →
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

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
          Đầu tư tài sản sinh học cao cấp
        </motion.h1>
        <p className="relative text-lg mt-3 opacity-90">
          Khám phá các tài sản sinh học quý hiếm từ Việt Nam 🌿
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
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="mb-4"
            />
            {/* Bộ lọc danh mục (chỉ hiển thị khi chọn Products) */}
            {contentType === "Products" && (
              <>
                <label className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 mb-2">
                  <Tag className="w-4 h-4" /> Loại tài sản
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
                  <option value="Sâm">Sâm</option>
                  <option value="Nấm">Nấm</option>
                  <option value="Cây cảnh">Cây cảnh</option>
                  <option value="Trầm hương">Trầm hương</option>
                </select>
              </>
            )}
          </div>

          {/* Tài sản nổi bật - hiển thị cả Products */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-green-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-green-600 mb-5 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" /> Nổi bật
            </h2>

            <div className="flex flex-col gap-6">
              {/* Products nổi bật */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-5 space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wide">
                  Tài sản sinh học cao cấp
                </p>
                {featuredProducts.map((fp) => (
                  <div
                    key={`p-${fp.id}`}
                    className="flex items-center gap-3 bg-green-50 dark:bg-gray-700 p-3 rounded-xl hover:bg-green-100 dark:hover:bg-gray-600 transition-all shadow-sm"
                  >
                    <img
                      src={fp.image}
                      alt={fp.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex flex-col justify-center flex-1">
                      <p className="text-sm font-semibold leading-tight">{fp.name}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {fp.price.toLocaleString("vi-VN")} VNĐ/đơn vị
                      </p>
                      <a
                        href={`https://magiceden.io/marketplace/${fp.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-xs text-blue-600 hover:underline"
                      >
                        Tìm hiểu thêm
                      </a>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          </div>
        </aside>

        {/* Khu vực chính */}
        <main className="flex-1">
          {(isLoadingProducts) ? (
            <p className="text-center text-gray-500">Đang tải dữ liệu...</p>
          ) : (isErrorProducts) ? (
            <p className="text-center text-red-500">Không thể tải dữ liệu 😢</p>
          ) : (
            <>
              {/* Render Products Section */}
              {renderProductsSection()}
            </>
          )}
        </main>

        
      </section>
    </div>
  );
};

export default Shop;
