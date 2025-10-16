import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchCarbonCredits } from "../../services/api";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Link } from "react-router-dom";
import { Filter, Tag, Star, Package, Cloud } from "lucide-react";
import ProductCard from "../../components/ui/ProductCard";
import CarbonCard from "../../components/ui/CarbonCard";
import type { Product, CarbonCredit } from "../../types/types";

const Shop = () => {
  const { data: products = [], isLoading: isLoadingProducts, isError: isErrorProducts } = useQuery({
    queryKey: ["shopProducts"],
    queryFn: fetchProducts,
  });

  const { data: carbonCredits = [], isLoading: isLoadingCarbonCredits, isError: isErrorCarbonCredits } = useQuery({
    queryKey: ["carbonCredits"],
    queryFn: fetchCarbonCredits,
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [contentType, setContentType] = useState<"All" | "Products" | "Carbon Credits">("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Kiểm tra xem có đang sử dụng bộ lọc không
  const isUsingFilter = search !== "" || category !== "" || contentType !== "All";

  // Lọc và tìm kiếm cho Products
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

  // Lọc và tìm kiếm cho Carbon Credits
  const filteredCarbonCredits = useMemo(() => {
    return carbonCredits.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [carbonCredits, search]);

  // Phân trang - chỉ áp dụng khi có bộ lọc
  const productsTotalPages = isUsingFilter ? Math.ceil(filteredProducts.length / itemsPerPage) : 1;
  const carbonCreditsTotalPages = isUsingFilter ? Math.ceil(filteredCarbonCredits.length / itemsPerPage) : 1;

  const productsStartIndex = (currentPage - 1) * itemsPerPage;
  const carbonCreditsStartIndex = (currentPage - 1) * itemsPerPage;

  const paginatedProducts = isUsingFilter
    ? filteredProducts.slice(productsStartIndex, productsStartIndex + itemsPerPage)
    : filteredProducts;

  const paginatedCarbonCredits = isUsingFilter
    ? filteredCarbonCredits.slice(carbonCreditsStartIndex, carbonCreditsStartIndex + itemsPerPage)
    : filteredCarbonCredits;

  // Sản phẩm nổi bật - luôn hiển thị cả Products và Carbon Credits
  const featuredProducts = useMemo(() => products.slice(0, 3), [products]);
  const featuredCarbonCredits = useMemo(() => carbonCredits.slice(0, 3), [carbonCredits]);

  // Xác định loại item để render
  const getItemType = (item: Product | CarbonCredit): "Product" | "CarbonCredit" => {
    return "price" in item ? "Product" : "CarbonCredit";
  };

  // Render section cho Products
  const renderProductsSection = () => {
    if (contentType === "Carbon Credits") return null;

    const productsToShow = isUsingFilter ? paginatedProducts : filteredProducts;
    const productsCount = isUsingFilter ? filteredProducts.length : products.length;
    const productsPages = isUsingFilter ? productsTotalPages : 1;

    return (
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
            <Package className="w-6 h-6" /> Sản phẩm cao cấp
          </h2>
          {isUsingFilter && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {productsCount} kết quả
            </div>
          )}
        </div>

        {(isLoadingProducts) ? (
          <p className="text-center text-gray-500">Đang tải sản phẩm...</p>
        ) : (isErrorProducts) ? (
          <p className="text-center text-red-500">Không thể tải sản phẩm 😢</p>
        ) : productsToShow.length === 0 ? (
          <p className="text-center text-gray-600">Không tìm thấy sản phẩm phù hợp.</p>
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

  // Render section cho Carbon Credits
  const renderCarbonCreditsSection = () => {
    if (contentType === "Products") return null;

    const creditsToShow = isUsingFilter ? paginatedCarbonCredits : filteredCarbonCredits;
    const creditsCount = isUsingFilter ? filteredCarbonCredits.length : carbonCredits.length;
    const creditsPages = isUsingFilter ? carbonCreditsTotalPages : 1;

    return (
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
            <Cloud className="w-6 h-6" /> Tín chỉ carbon
          </h2>
          {isUsingFilter && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {creditsCount} kết quả
            </div>
          )}
        </div>

        {(isLoadingCarbonCredits) ? (
          <p className="text-center text-gray-500">Đang tải tín chỉ carbon...</p>
        ) : (isErrorCarbonCredits) ? (
          <p className="text-center text-red-500">Không thể tải tín chỉ carbon 😢</p>
        ) : creditsToShow.length === 0 ? (
          <p className="text-center text-gray-600">Không tìm thấy tín chỉ carbon phù hợp.</p>
        ) : (
          <>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.15 }}
            >
              {creditsToShow.map((credit) => (
                <motion.div key={credit.id}>
                  <Link to={`/carbon-credit/${credit.id}`}>
                    <CarbonCard credit={credit} />
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination cho Carbon Credits */}
            {isUsingFilter && creditsPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-10">
                <Button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  ← Trước
                </Button>
                <span className="font-semibold">
                  Trang {currentPage} / {creditsPages}
                </span>
                <Button
                  disabled={currentPage === creditsPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="bg-blue-600 text-white hover:bg-blue-700"
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
          Đầu tư nông sản cao cấp & tín chỉ carbon
        </motion.h1>
        <p className="relative text-lg mt-3 opacity-90">
          Khám phá các sản phẩm tươi sạch và tín chỉ carbon từ nông trại Việt 🌾
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

            {/* Bộ chọn loại nội dung */}
            <div className="mb-4">
              <label className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 mb-2">
                <Tag className="w-4 h-4" /> Loại nội dung
              </label>
              <select
                value={contentType}
                onChange={(e) => {
                  setContentType(e.target.value as "All" | "Products" | "Carbon Credits");
                  setCategory("");
                  setCurrentPage(1);
                }}
                className="w-full border rounded-lg p-2 mb-2 dark:bg-gray-700 dark:text-white"
              >
                <option value="All">Tất cả</option>
                <option value="Products">Sản phẩm cao cấp</option>
                <option value="Carbon Credits">Tín chỉ carbon</option>
              </select>
            </div>

            {/* Bộ lọc danh mục (chỉ hiển thị khi chọn Products) */}
            {contentType === "Products" && (
              <>
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
              </>
            )}
          </div>

          {/* Sản phẩm nổi bật - hiển thị cả Products và Carbon Credits */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-green-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-green-600 mb-5 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" /> Nổi bật
            </h2>

            <div className="flex flex-col gap-6">
              {/* Products nổi bật */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-5 space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wide">
                  Sản phẩm cao cấp
                </p>
                {featuredProducts.map((fp) => (
                  <Link
                    to={`/product/${fp.id}`}
                    key={`p-${fp.id}`}
                    className="flex items-center gap-3 bg-green-50 dark:bg-gray-700 p-3 rounded-xl hover:bg-green-100 dark:hover:bg-gray-600 transition-all shadow-sm"
                  >
                    <img
                      src={fp.image}
                      alt={fp.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex flex-col justify-center">
                      <p className="text-sm font-semibold leading-tight">{fp.name}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {fp.price.toLocaleString("vi-VN")} VNĐ/đơn vị
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Carbon Credits nổi bật */}
              <div className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wide">
                  Tín chỉ carbon
                </p>
                {featuredCarbonCredits.map((cc) => (
                  <Link
                    to={`/carbon-credit/${cc.id}`}
                    key={`c-${cc.id}`}
                    className="flex items-center gap-3 bg-blue-50 dark:bg-gray-700 p-3 rounded-xl hover:bg-blue-100 dark:hover:bg-gray-600 transition-all shadow-sm"
                  >
                    <img
                      src={cc.image}
                      alt={cc.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex flex-col justify-center">
                      <p className="text-sm font-semibold text-blue-800 leading-tight">
                        {cc.name}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        {cc.pricePerTon.toLocaleString("vi-VN")} VNĐ/tấn CO₂
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

        </aside>

        {/* Khu vực chính */}
        <main className="flex-1">
          {(isLoadingProducts || isLoadingCarbonCredits) ? (
            <p className="text-center text-gray-500">Đang tải dữ liệu...</p>
          ) : (isErrorProducts || isErrorCarbonCredits) ? (
            <p className="text-center text-red-500">Không thể tải dữ liệu 😢</p>
          ) : (
            <>
              {/* Render Products Section */}
              {renderProductsSection()}

              {/* Render Carbon Credits Section */}
              {renderCarbonCreditsSection()}
            </>
          )}
        </main>
      </section>
    </div>
  );
};

export default Shop;