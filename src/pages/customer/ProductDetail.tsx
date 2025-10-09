import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { fetchProducts } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import QRViewer from "../../components/ui/QRViewer";
import { Leaf, Truck, ClipboardCheck, Store, Utensils, Sprout } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  origin: string;
}

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

  const addToCart = () => {
  if (!product) return;
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const existing = cart.find((i: any) => i.id === product.id);
  if (existing) existing.quantity += 1;
  else cart.push({ ...product, quantity: 1 });
  localStorage.setItem("cart", JSON.stringify(cart));

  // 🔥 Bắn sự kiện thông báo cập nhật giỏ hàng
  window.dispatchEvent(new Event("cartUpdated"));

  alert("✅ Đã thêm vào giỏ hàng!");
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
        ❌ Không tìm thấy sản phẩm
      </div>
    );

  // 👣 Dữ liệu timeline với ngày tháng cụ thể
  const timelineSteps = [
    {
      icon: <Sprout className="w-8 h-8 text-green-600" />,
      title: "Trồng trọt",
      desc: "Canh tác hữu cơ tại nông trại đạt chuẩn VietGAP.",
      date: "01/08/2025",
    },
    {
      icon: <Leaf className="w-8 h-8 text-green-600" />,
      title: "Thu hoạch",
      desc: "Sản phẩm được thu hoạch thủ công, đảm bảo tươi mới.",
      date: "15/09/2025",
    },
    {
      icon: <Truck className="w-8 h-8 text-green-600" />,
      title: "Vận chuyển",
      desc: "Vận chuyển trong điều kiện bảo quản an toàn.",
      date: "17/09/2025",
    },
    {
      icon: <ClipboardCheck className="w-8 h-8 text-green-600" />,
      title: "Kiểm định",
      desc: "Đạt tiêu chuẩn chất lượng VietGAP trước khi đưa ra thị trường.",
      date: "18/09/2025",
    },
    {
      icon: <Store className="w-8 h-8 text-green-600" />,
      title: "Phân phối",
      desc: "Phân phối đến các siêu thị và cửa hàng liên kết.",
      date: "19/09/2025",
    },
    {
      icon: <Utensils className="w-8 h-8 text-green-600" />,
      title: "Bàn ăn",
      desc: "Đến tay người tiêu dùng – tươi sạch, an toàn.",
      date: "20/09/2025",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 py-14">
      {/* 🥦 Phần chi tiết sản phẩm */}
      <section className="max-w-6xl mx-auto px-6 md:px-10">
        <div className="flex flex-col md:flex-row gap-10 items-center">
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-80 h-80 object-cover rounded-3xl shadow-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          />
          <div>
            <motion.h1
              className="text-4xl font-bold text-green-700 dark:text-green-300 mb-2"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {product.name}
            </motion.h1>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Xuất xứ: {product.origin}
            </p>
            <p className="text-2xl font-semibold text-green-600 mb-4">
              {product.price.toLocaleString()} VNĐ
            </p>
            <Button
              onClick={addToCart}
              className="rounded-full bg-green-600 hover:bg-green-700 text-white px-6 py-2 transition-all"
            >
              🛒 Thêm vào giỏ hàng
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="mt-10">
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="trace">Truy xuất</TabsTrigger>
          </TabsList>

          {/* 🌿 Tab: Thông tin */}
          <TabsContent
            value="info"
            className="p-6 rounded-2xl bg-green-50/60 dark:bg-gray-800 shadow-md mt-4"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">👨‍🌾</span>
              <p className="text-gray-800 dark:text-gray-200 font-medium">
                <strong>Nông dân:</strong> Nguyễn Văn A
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">🌱</span>
              <p className="text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                Sản phẩm đạt chứng nhận{" "}
                <strong className="text-green-700 dark:text-green-400">
                  VietGAP
                </strong>{" "}
                – canh tác hữu cơ, bảo vệ môi trường và sức khỏe người tiêu dùng.
              </p>
            </div>
          </TabsContent>

          {/* 🔍 Tab: Truy xuất */}
          <TabsContent value="trace" className="flex justify-center p-4 mt-4">
            <QRViewer value={`https://solanaexplorer.io/tx/${product.id}`} />
          </TabsContent>
        </Tabs>
      </section>

      {/* 🌾 Timeline: Từ nông trại đến bàn ăn */}
      <section className="max-w-5xl mx-auto mt-16 px-6">
        <motion.h2
          className="text-3xl font-bold text-center text-green-700 dark:text-green-400 mb-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Hành trình “Từ nông trại đến bàn ăn”
        </motion.h2>

        <div className="relative border-l-4 border-green-500 ml-4">
          {timelineSteps.map((step, i) => (
            <motion.div
              key={i}
              className="mb-10 ml-6"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.2 }}
              viewport={{ once: true }}
            >
              <span className="absolute -left-6 flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full ring-4 ring-white shadow-md">
                {step.icon}
              </span>
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
                {step.title}{" "}
                <span className="text-sm text-gray-500 ml-2">
                  ({step.date})
                </span>
              </h3>
              <p className="text-gray-600 dark:text-gray-400">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ProductDetail;
