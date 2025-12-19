import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

type Order = {
  id: string;
  date: string;
  total: number;
  status: string;
  customerName: string;
  phone: string;
  address: string;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Đã giao":
      return "bg-green-100 text-green-700";
    case "Đang xử lý":
    case "pending":
      return "bg-yellow-100 text-yellow-700";
    case "Đã hủy":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch("https://server-x0u1.onrender.com/api/orders"); // ← Gọi backend thật
        if (!response.ok) {
          throw new Error("Không thể tải danh sách đơn hàng");
        }
        const data = await response.json();
        setOrders(data);
      } catch (err: any) {
        setError(err.message || "Đã có lỗi xảy ra");
        console.error("Lỗi fetch orders:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <p className="text-xl">Đang tải đơn hàng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <p className="text-xl text-red-600">Lỗi: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      <motion.section
        className="max-w-5xl mx-auto px-6 py-10"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold text-green-700 dark:text-green-400 mb-6">
          📦 Lịch sử đơn hàng
        </h1>

        {orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-10 text-center">
            <p className="text-gray-500 text-lg">Bạn chưa có đơn hàng nào.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-lg">Ngày đặt</TableHead>
                  <TableHead className="text-lg">Khách hàng</TableHead>
                  <TableHead className="text-lg">Số điện thoại</TableHead>
                  <TableHead className="text-lg">Tổng tiền</TableHead>
                  <TableHead className="text-lg">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {new Date(order.date).toLocaleDateString("vi-VN")}
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>{order.phone}</TableCell>
                    <TableCell>{order.total.toLocaleString("vi-VN")} VNĐ</TableCell>
                    <TableCell>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status === "pending" ? "Đang xử lý" : order.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.section>
    </div>
  );
};

export default Orders;