import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import Notification from "../../components/ui/ToastNotification";
import { Cpu, Timer, Activity, Coins, ShieldCheck, Database, TrendingUp } from "lucide-react";
import { fetchProducts } from "../../services/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Product } from "../../types/types";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotif, setShowNotif] = useState(false);
  const [buyType, setBuyType] = useState<'dut' | 'daihan'>('daihan');

  useEffect(() => {
    const load = async () => {
      const data = await fetchProducts();
      const found = data.find((p) => p.id === id);
      setProduct(found || null);
      setLoading(false);
    };
    load();
  }, [id]);

  const addToCart = () => {
    if (!product) return;
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((i: any) => i.id === product.id && i.buyType === buyType);
    if (existing) {
      setShowNotif(true);
      return;
    } else {
      cart.push({ ...product, buyType });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    setShowNotif(true);
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-green-600 text-lg">
        ⏳ Đang tải...
      </div>
    );

  if (!product)
    return (
      <div className="h-screen flex items-center justify-center text-red-500 text-lg">
        ❌ Không tìm thấy tài sản sinh học
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 py-16">
      {/* --- Header section --- */}
      <section className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <motion.div
            className="relative group"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <img
              src={product.image}
              alt={product.name}
              className="w-full max-w-md mx-auto object-cover rounded-2xl shadow-2xl border border-amber-200"
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-amber-200/10 via-transparent to-green-100/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold text-green-800 dark:text-green-200 tracking-tight">
              {product.name}
            </h1>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              <strong>Xuất xứ:</strong> {product.origin}
            </p>

            <div className="grid grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-amber-500" />
                <span>{product.age} năm tuổi</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                <span>Tăng trưởng: {product.growthRate}%</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Cpu className="w-5 h-5 text-sky-500" />
                <span>Trạng thái IoT: {product.iotStatus}</span>
              </div>
              <div className="col-span-2 bg-green-100 dark:bg-gray-800 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-green-700 dark:text-green-300">
                  Dữ liệu IoT chi tiết (cập nhật gần nhất: {new Date(product.iotData.lastUpdated).toLocaleString('vi-VN')})
                </h4>
                <ul className="list-disc pl-5 text-sm">
                  <li>Chiều cao hiện tại: {product.iotData.height} cm</li>
                  <li>Tăng trưởng trung bình/tháng: {product.iotData.growthPerMonth} cm</li>
                  <li>Độ ẩm đất: {product.iotData.humidity}%</li>
                  <li>Nhiệt độ môi trường: {product.iotData.temperature}°C</li>
                  <li>Độ pH: {product.iotData.pH}</li>
                </ul>
              </div>
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-500" />
                <span>ROI: {product.roi}%</span>
              </div>
            </div>

            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {product.price.toLocaleString()} VNĐ
            </p>

            <div className="flex items-center gap-4">
              <Select onValueChange={(value) => setBuyType(value as 'dut' | 'daihan')} defaultValue="daihan">
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Loại đầu tư" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daihan">Mua dài hạn (giữ NFT)</SelectItem>
                  <SelectItem value="dut">Mua đứt (burn NFT nhận hàng)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={addToCart}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold shadow-md hover:shadow-lg transition-all"
              >
                💰 Thêm vào giỏ
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="mt-16">
          <TabsList className="bg-green-100 dark:bg-gray-800 rounded-full p-1">
            <TabsTrigger
              value="info"
              className="rounded-full px-6 py-2 text-green-700 data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              Thông tin chi tiết
            </TabsTrigger>
            <TabsTrigger
              value="trace"
              className="rounded-full px-6 py-2 text-green-700 data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              Chuỗi truy xuất
            </TabsTrigger>
            <TabsTrigger
              value="marketPrice"
              className="rounded-full px-6 py-2 text-green-700 data-[state=active]:bg-green-600 data-[state=active]:text-white"
            >
              Giá thị trường
            </TabsTrigger>
          </TabsList>

          {/* Info */}
          <TabsContent
            value="info"
            className="p-8 mt-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm"
          >
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">
                {product.description}
              </p>

              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-green-500" />
                <div>
                  <strong>Chứng nhận:</strong>
                  <ul className="list-disc pl-6">
                    {product.certifications?.length ? (
                      product.certifications.map((c, i) => <li key={i}>{c.name}</li>)
                    ) : (
                      <li>Không có chứng nhận</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-amber-600" />
                <p>
                  Mã giao dịch blockchain:{" "}
                  <a
                    href={`https://solanaexplorer.io/tx/${product.blockchainTxId}`}
                    target="_blank"
                    className="text-blue-500 hover:underline"
                  >
                    {product.blockchainTxId}
                  </a>
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Trace */}
          <TabsContent
            value="trace"
            className="p-8 mt-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
                Mỗi giai đoạn trong hành trình phát triển tài sản được ghi lại
                trên blockchain Solana với dữ liệu IoT xác thực.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                {product.timeline.map((step, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.03 }}
                    className="bg-gradient-to-br from-green-50 to-amber-50 dark:from-gray-800 dark:to-gray-700 border border-green-200 dark:border-gray-700 rounded-xl p-4 shadow-md"
                  >
                    <h3 className="font-semibold text-green-700 dark:text-green-300">
                      {step.title}{" "}
                      <span className="text-xs text-gray-500">({step.date})</span>
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {step.desc}
                    </p>
                    {step.location && (
                      <p className="text-sm text-gray-500">
                        📍 {step.location}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* Market Price */}
          <TabsContent
            value="marketPrice"
            className="p-8 mt-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <h3 className="text-xl font-bold text-green-700 dark:text-green-300 flex items-center gap-2">
                <TrendingUp className="w-6 h-6" /> Biến động giá thị trường
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Biểu đồ dưới đây thể hiện giá của {product.name} qua các thời điểm trên thị trường.
              </p>
              <div className="h-[400px] w-full">
                {product.priceHistory && product.priceHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={product.priceHistory}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        tickFormatter={(date) => new Date(date).toLocaleDateString("vi-VN", { month: "short", year: "2-digit" })}
                      />
                      <YAxis
                        stroke="#6b7280"
                        tickFormatter={(value) => `${(value / 1000).toLocaleString("vi-VN")}K VNĐ`}
                      />
                      <Tooltip
                        formatter={(value: number) => `${value.toLocaleString("vi-VN")} VNĐ`}
                        labelFormatter={(date) => new Date(date).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" })}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#16a34a"
                        strokeWidth={2}
                        dot={{ stroke: "#16a34a", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-center">
                    Không có dữ liệu giá lịch sử cho sản phẩm này.
                  </p>
                )}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </section>

      <Notification
        message="✅ Đã thêm tài sản vào danh mục đầu tư!"
        visible={showNotif}
        onClose={() => setShowNotif(false)}
        type="success"
      />
    </div>
  );
};

export default ProductDetail;