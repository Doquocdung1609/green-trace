// src/pages/customer/ProductDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../../components/ui/Header";
import Footer from "../../components/ui/Footer";
import QRViewer from "../../components/ui/QRViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Button } from "../../components/ui/button";
import { motion } from "framer-motion";
import { fetchProducts } from "../../services/api";

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

  // 🔄 Fetch product theo ID
  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      const products = await fetchProducts();
      const found = products.find((item) => item.id === id);
      setProduct(found || null);
      setLoading(false);
    };
    loadProduct();
  }, [id]);

  const addToCart = () => {
    if (!product) return;

    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find((item: any) => item.id === product.id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });

    localStorage.setItem("cart", JSON.stringify(cart));
    alert("✅ Đã thêm vào giỏ hàng!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center text-green-700 text-xl">
        ⏳ Đang tải sản phẩm...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex justify-center items-center text-red-600 text-xl">
        ❌ Không tìm thấy sản phẩm
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">

      <section className="p-10 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-10 items-center">
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-80 h-80 rounded-2xl shadow-lg object-cover"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          />

          <div>
            <h1 className="text-4xl font-bold text-green-700 dark:text-green-300 mb-3">
              {product.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-2">{product.origin}</p>
            <p className="text-xl font-semibold text-green-600 mb-4">
              {product.price.toLocaleString()} VNĐ
            </p>
            <Button
              onClick={addToCart}
              className="rounded-full bg-green-600 hover:bg-green-700 text-white"
            >
              🛒 Thêm vào giỏ hàng
            </Button>
          </div>
        </div>

        {/* Tabs: Thông tin - Truy xuất */}
        <Tabs defaultValue="info" className="mt-10">
          <TabsList>
            <TabsTrigger value="info">Thông tin</TabsTrigger>
            <TabsTrigger value="trace">Truy xuất</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="p-4">
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              👨‍🌾 Nông dân: Nguyễn Văn A
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              🌱 Sản phẩm đạt tiêu chuẩn VietGAP, canh tác hữu cơ, không sử dụng
              thuốc trừ sâu độc hại.
            </p>
          </TabsContent>

          <TabsContent value="trace" className="flex justify-center p-4">
            <QRViewer value={`https://solanaexplorer.io/tx/${product.id}`} />
          </TabsContent>
        </Tabs>
      </section>

    </div>
  );
};

export default ProductDetail;
