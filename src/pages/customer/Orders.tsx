import React from "react";
import { motion } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

const mockOrders = [
  { id: 1, date: "01/10/2025", total: "500.000 VNĐ", status: "Đã giao" },
  { id: 2, date: "02/10/2025", total: "300.000 VNĐ", status: "Đang xử lý" },
  { id: 3, date: "03/10/2025", total: "250.000 VNĐ", status: "Đã hủy" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Đã giao":
      return "bg-green-100 text-green-700";
    case "Đang xử lý":
      return "bg-yellow-100 text-yellow-700";
    case "Đã hủy":
      return "bg-red-100 text-red-700";
    default:
      return "";
  }
};

const Orders = () => {
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

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-lg">Ngày đặt</TableHead>
                <TableHead className="text-lg">Tổng tiền</TableHead>
                <TableHead className="text-lg">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.date}</TableCell>
                  <TableCell>{order.total}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.section>
    </div>
  );
};

export default Orders;
