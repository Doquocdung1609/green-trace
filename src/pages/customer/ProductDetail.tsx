// ProductDetail.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchProducts } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import QRViewer from "../../components/ui/QRViewer";
import { Leaf, Truck, ClipboardCheck, Store, Utensils, Sprout, QrCode, ShieldCheck } from "lucide-react";
import Notification from "../../components/ui/ToastNotification";
import type { Product } from "../../types/types";

const getIcon = (title: string) => {
  switch (title) {
    case 'Trồng trọt': return <Sprout className="w-8 h-8 text-green-600" />;
    case 'Thu hoạch': return <Leaf className="w-8 h-8 text-green-600" />;
    case 'Vận chuyển': return <Truck className="w-8 h-8 text-green-600" />;
    case 'Kiểm định': return <ClipboardCheck className="w-8 h-8 text-green-600" />;
    case 'Phân phối': return <Store className="w-8 h-8 text-green-600" />;
    case 'Bàn ăn': return <Utensils className="w-8 h-8 text-green-600" />;
    default: return <Leaf className="w-8 h-8 text-green-600" />;
  }
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await fetchProducts();
      const found = data.find((p) => p.id === id);
      setProduct(found || null);
      setLoading(false);
    };
    load();
  }, [id]);

  const [showNotif, setShowNotif] = useState(false);

  const addToCart = () => {
    if (!product || !product.inStock || product.quantity <= 0) return;
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((i: any) => i.id === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));
    setShowNotif(true);
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-green-600 text-lg">⏳ Đang tải...</div>;
  if (!product) return <div className="h-screen flex items-center justify-center text-red-500 text-lg">❌ Không tìm thấy sản phẩm</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 py-16">
      <section className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div className="relative group" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <img src={product.image} alt={product.name} className="w-full max-w-md mx-auto object-cover rounded-2xl shadow-xl transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-green-200/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </motion.div>
          <div className="space-y-6">
            <motion.h1 className="text-4xl md:text-5xl font-extrabold text-green-800 dark:text-green-200 tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              {product.name}
            </motion.h1>
            <p className="text-lg text-gray-600 dark:text-gray-300"><span className="font-semibold">Xuất xứ:</span> {product.origin}</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{product.price.toLocaleString()} VNĐ</p>
            <p className="text-sm text-gray-500">Số lượng còn: {product.quantity} | {product.inStock ? 'Còn hàng' : 'Hết hàng'}</p>
            <Button onClick={addToCart} className="rounded-full bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold shadow-md transition-all duration-300 hover:shadow-lg" disabled={!product.inStock || product.quantity <= 0}>
              🛒 Thêm vào giỏ hàng
            </Button>
          </div>
        </div>

        <Tabs defaultValue="info" className="mt-12">
          <TabsList className="bg-green-100 dark:bg-gray-800 rounded-full p-1">
            <TabsTrigger value="info" className="rounded-full px-6 py-2 text-green-700 dark:text-green-300 data-[state=active]:bg-green-600 data-[state=active]:text-white">Thông tin</TabsTrigger>
            <TabsTrigger value="trace" className="rounded-full px-6 py-2 text-green-700 dark:text-green-300 data-[state=active]:bg-green-600 data-[state=active]:text-white">Truy xuất nguồn gốc</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="p-8 mt-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-3xl">👨‍🌾</span>
                <p className="text-lg text-gray-800 dark:text-gray-200"><strong>Nông dân:</strong> {product.farmerName}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-3xl">🌱</span>
                <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">{product.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-8 h-8 text-green-600" />
                <div>
                  <strong>Chứng nhận:</strong>
                  <ul className="list-disc pl-5">
                    {product.certifications.map((cert, i) => <li key={i}>{cert}</li>)}
                  </ul>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="trace" className="p-8 mt-4 rounded-2xl bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
              <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed font-semibold">
                Dữ liệu nguồn gốc được ghi nhận trên Solana Blockchain, đảm bảo tính minh bạch, không thể thay đổi và có thể truy xuất tức thì. Mỗi bước trong chuỗi cung ứng được xác thực để mang đến sản phẩm an toàn nhất cho bạn.
              </p>
              <div className="flex items-center gap-4">
                <QrCode className="w-8 h-8 text-green-600" />
                <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
                  Quét mã QR để xem giao dịch blockchain: <a href={`https://solanaexplorer.io/tx/${product.blockchainTxId}`} className="text-blue-500 hover:underline">Xem trên Solana Explorer</a>
                </p>
              </div>
              <div className="flex justify-center">
                <QRViewer value={`https://solanaexplorer.io/tx/${product.blockchainTxId}`} />
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </section>

      <section className="max-w-5xl mx-auto mt-16 px-6">
        <motion.h2 className="text-3xl md:text-4xl font-bold text-center text-green-800 dark:text-green-300 mb-12" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          Hành trình “Từ nông trại đến bàn ăn” (Xác thực bởi Blockchain)
        </motion.h2>

        <div className="relative border-l-4 border-green-500 ml-6">
          {product.timeline.map((step, i) => (
            <motion.div key={i} className="mb-12 ml-8 relative" initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2, duration: 0.5 }} viewport={{ once: true }}>
              <span className="absolute -left-10 flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full ring-4 ring-white shadow-md transition-transform duration-300 hover:scale-110">
                {getIcon(step.title)}
              </span>
              <div className="bg-white/60 dark:bg-gray-800/60 p-4 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-green-700 dark:text-green-300">
                  {step.title} <span className="text-sm text-gray-500 ml-2">({step.date})</span>
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{step.desc}</p>
                {step.location && <p className="text-sm text-gray-500">Vị trí: {step.location}</p>}
                {step.responsible && <p className="text-sm text-gray-500">Người chịu trách nhiệm: {step.responsible}</p>}
                {step.details && <p className="text-sm text-gray-500">Chi tiết: {step.details}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
      <Notification message="Đã thêm sản phẩm vào giỏ hàng!" visible={showNotif} onClose={() => setShowNotif(false)} type="success" />
    </div>
  );
};

export default ProductDetail;