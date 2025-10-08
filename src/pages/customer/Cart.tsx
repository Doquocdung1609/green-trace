import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";
import { Link } from "react-router-dom";

const Cart = () => {
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    setCart(JSON.parse(localStorage.getItem("cart") || "[]"));
  }, []);

  const updateQuantity = (id: string, delta: number) => {
    const updated = cart.map((item) =>
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    );
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  };

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      <motion.section
        className="max-w-5xl mx-auto px-6 py-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold text-green-700 dark:text-green-400 mb-6">🛍 Giỏ hàng</h1>

        {cart.length === 0 ? (
          <p className="text-center text-gray-500">Giỏ hàng của bạn đang trống 😢</p>
        ) : (
          <>
            <div className="space-y-6">
              {cart.map((item) => (
                <motion.div
                  key={item.id}
                  whileHover={{ scale: 1.01 }}
                  className="flex flex-col md:flex-row items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow"
                >
                  <div className="flex items-center gap-4">
                    <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
                    <div>
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-green-600 font-medium">{item.price.toLocaleString()} VNĐ</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => updateQuantity(item.id, -1)}>-</Button>
                    <span>{item.quantity}</span>
                    <Button variant="outline" onClick={() => updateQuantity(item.id, 1)}>+</Button>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 text-right">
              <p className="text-2xl font-semibold mb-3">Tổng cộng: {total.toLocaleString()} VNĐ</p>
              <Link to="/checkout">
                <Button className="bg-green-600 text-white hover:bg-green-700 px-8 py-3 rounded-full">
                  Tiến hành thanh toán
                </Button>
              </Link>
            </div>
          </>
        )}
      </motion.section>
    </div>
  );
};

export default Cart;
