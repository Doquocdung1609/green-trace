import { useState } from "react";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import Header from "../../components/ui/Header";
import Footer from "../../components/ui/Footer";
import ProductCard from "../../components/ui/ProductCard";
import CarbonCard from "../../components/ui/CarbonCard";
import { fetchProducts, fetchCarbonCredits } from "../../services/api";
import { useQuery } from "@tanstack/react-query";
import { Input } from "../../components/ui/input";
import { Filter, MapPin, Tag } from "lucide-react";
import type { Product, CarbonCredit } from "../../types/types";

const Market = () => {
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });

  const { data: carbonCredits, isLoading: loadingCarbon } = useQuery({
    queryKey: ["carbonCredits"],
    queryFn: fetchCarbonCredits,
  });

  const [tab, setTab] = useState<"bio" | "carbon">("bio");
  const [filter, setFilter] = useState({ type: "", price: "", location: "" });

  const filteredProducts = products?.filter((p: Product) => {
    const matchesType = filter.type ? p.name.toLowerCase().includes(filter.type.toLowerCase()) : true;
    const matchesPrice = filter.price ? p.price <= Number(filter.price) : true;
    const matchesLocation = filter.location ? p.origin.toLowerCase().includes(filter.location.toLowerCase()) : true;
    return matchesType && matchesPrice && matchesLocation;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header />

      {/* 🌿 Hero */}
      <section className="relative bg-green-600 text-white text-center py-20 shadow-md">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-20"></div>
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-5xl font-bold"
        >
          🌾 GreenTrace Marketplace
        </motion.h1>
        <p className="relative text-lg mt-3 opacity-90">
          Khám phá tài sản sinh học & tín chỉ carbon minh bạch trên Blockchain Solana
        </p>
      </section>

      {/* Main Section */}
      <section className="p-6 max-w-7xl mx-auto flex gap-6">
        {/* Sidebar */}
        <motion.aside
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="w-1/4 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-green-100 dark:border-gray-700"
        >
          <h2 className="text-xl font-bold mb-4 text-green-600 flex items-center gap-2">
            <Filter className="w-5 h-5" /> Bộ lọc
          </h2>

          <div className="space-y-4">
            {/* Chọn tab */}
            <div className="flex justify-between bg-gray-100 dark:bg-gray-700 rounded-full p-1">
              <button
                className={`w-1/2 py-2 rounded-full font-medium ${tab === "bio" ? "bg-green-500 text-white" : "text-gray-600 dark:text-gray-300"}`}
                onClick={() => setTab("bio")}
              >
                🌿 BioAssets
              </button>
              <button
                className={`w-1/2 py-2 rounded-full font-medium ${tab === "carbon" ? "bg-blue-500 text-white" : "text-gray-600 dark:text-gray-300"}`}
                onClick={() => setTab("carbon")}
              >
                🌍 Carbon
              </button>
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 mb-1">
                <Tag className="w-4 h-4" /> Loại
              </label>
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 mb-1">Giá tối đa (VND)</label>
              <Input placeholder="VD: 100000" type="number" onChange={(e) => setFilter({ ...filter, price: e.target.value })} />
            </div>

            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 mb-1">
                <MapPin className="w-4 h-4" /> Khu vực
              </label>
              <Input placeholder="VD: Đắk Lắk" onChange={(e) => setFilter({ ...filter, location: e.target.value })} />
            </div>
          </div>
        </motion.aside>

        {/* Products / Carbon */}
        <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }} className="w-3/4">
          <h1 className="text-3xl font-bold mb-6 text-green-700 dark:text-green-400">
            {tab === "bio" ? "🌿 Sản phẩm sinh học" : "🌍 Dự án tín chỉ Carbon"}
          </h1>

          {tab === "bio" ? (
            loadingProducts ? (
              <p className="text-center">Đang tải sản phẩm...</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts?.map((product: Product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )
          ) : loadingCarbon ? (
            <p className="text-center">Đang tải tín chỉ carbon...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {carbonCredits?.map((credit: CarbonCredit) => (
                <CarbonCard key={credit.id} credit={credit} />
              ))}
            </div>
          )}
        </motion.main>
      </section>

      <Footer />
    </div>
  );
};

export default Market;
