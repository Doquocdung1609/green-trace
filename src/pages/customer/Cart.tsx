import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { fetchProducts } from "../../services/api";
import { toast } from "../../hooks/use-toast";
import type { Product } from "../../types/types";

const Cart = () => {
  const [cart, setCart] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
      const fetchedProducts = await fetchProducts();
      setCart(storedCart);
      setProducts(fetchedProducts);
    };
    loadData();
  }, []);

  const removeItem = (id: string, buyType: string) => {
    const updated = cart.filter((item) => !(item.id === id && item.buyType === buyType));
    setCart(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    window.dispatchEvent(new Event("cartUpdated"));
    toast({
      title: "Đã xóa",
      description: "Sản phẩm đã được xóa khỏi giỏ hàng.",
    });
  };

  const total = cart.reduce((sum, i) => sum + i.price, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      <motion.section
        className="max-w-6xl mx-auto px-6 py-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-8 text-green-700">
          Giỏ hàng của bạn 🛒
        </h1>

        {cart.length === 0 ? (
          <div className="text-center text-gray-600 mt-20">
            <p className="text-lg mb-4">Không có sản phẩm nào trong giỏ hàng.</p>
            <Link
              to="/shop"
              className="text-green-600 font-semibold hover:underline"
            >
              Quay lại cửa hàng để tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-white dark:bg-gray-800 rounded-xl shadow">
                <thead>
                  <tr className="border-b text-left bg-green-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    <th className="p-4">Sản phẩm</th>
                    <th className="p-4">Loại đầu tư</th>
                    <th className="p-4">Đơn giá</th>
                    <th className="p-4">Thành tiền</th>
                    <th className="p-4">Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr
                      key={`${item.id}-${item.buyType}`}
                      className="border-b hover:bg-green-50 dark:hover:bg-gray-700 transition"
                    >
                      <td className="p-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      </td>
                      <td className="p-4 font-medium">
                        {item.buyType === 'daihan' ? 'Mua dài hạn' : 'Mua đứt'}
                      </td>
                      <td className="p-4 text-green-700 font-semibold">
                        {item.price.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="p-4 font-semibold">
                        {(item.price).toLocaleString("vi-VN")}đ
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => removeItem(item.id, item.buyType)}
                          className="text-red-500 hover:text-red-700 transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex flex-col md:flex-row justify-end items-center gap-4">
              <p className="text-xl font-semibold">
                Tổng tiền:{" "}
                <span className="text-green-700">
                  {total.toLocaleString("vi-VN")}đ
                </span>
              </p>

              <div className="flex gap-4">
                <Link to="/shop">
                  <Button variant="outline">Tiếp tục mua hàng</Button>
                </Link>
                <Link to="/checkout">
                  <Button className="bg-green-600 text-white hover:bg-green-700">
                    Tiến hành đặt hàng
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </motion.section>
    </div>
  );
};

export default Cart;