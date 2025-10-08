import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Link } from "react-router-dom";

const Shop = () => {
  const { data: products, isLoading, isError } = useQuery({
    queryKey: ["shopProducts"],
    queryFn: fetchProducts,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      <motion.section
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-6 py-10"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <h1 className="text-4xl font-bold text-green-700 dark:text-green-400">🛒 Cửa hàng</h1>
          <Input placeholder="🔍 Tìm sản phẩm..." className="md:w-1/3" />
        </div>

        {isLoading ? (
          <p className="text-center text-gray-500">Đang tải sản phẩm...</p>
        ) : isError ? (
          <p className="text-center text-red-500">Không thể tải sản phẩm 😢</p>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
          >
            {products?.map((product) => (
              <motion.div
                key={product.id}
                whileHover={{ scale: 1.03 }}
                className="bg-card rounded-2xl shadow-md hover:shadow-xl transition-all"
              >
                <Card className="overflow-hidden border-none">
                  <CardHeader className="p-0">
                    <img
                      src={product.image || "/placeholder.png"}
                      alt={product.name}
                      className="w-full h-56 object-cover"
                    />
                  </CardHeader>
                  <CardContent className="p-4 text-center">
                    <CardTitle className="font-semibold text-lg mb-2">{product.name}</CardTitle>
                    <p className="text-green-600 font-medium mb-3">
                      {product.price.toLocaleString("vi-VN")} VNĐ
                    </p>
                    <Link to={`/product/${product.id}`}>
                      <Button className="w-full bg-green-600 text-white hover:bg-green-700">
                        Xem chi tiết
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>
    </div>
  );
};

export default Shop;
