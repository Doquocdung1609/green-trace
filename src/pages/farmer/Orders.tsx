import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { fetchOrders } from '../../services/api';
import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';

interface Order {
  id: string | number;
  customerName: string;
  total: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled' | string;
}

const Orders: React.FC = () => {
  const { data: orders, isLoading, isError } = useQuery<Order[]>({
    queryKey: ['farmerOrders'],
    queryFn: fetchOrders,
  });

  if (isLoading) return <div className="p-6 text-center">Đang tải dữ liệu...</div>;
  if (isError) return <div className="p-6 text-red-500 text-center">Lỗi khi tải đơn hàng</div>;

  return (
    <DashboardLayout role="farmer">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6"
      >
        <h1 className="text-3xl font-bold mb-6 text-primary flex items-center">
          <ShoppingBag className="w-8 h-8 mr-2 text-green-600" />
          Danh sách đơn hàng
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-green-200 dark:border-green-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-green-50 dark:bg-gray-700">
                <TableHead>Mã đơn</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Tổng tiền (VNĐ)</TableHead>
                <TableHead>Ngày đặt</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="hover:bg-green-50 dark:hover:bg-gray-700 transition"
                >
                  <TableCell>{order.id}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.total?.toLocaleString('vi-VN')}</TableCell>
                  <TableCell>{new Date(order.date).toLocaleDateString('vi-VN')}</TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : order.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {order.status === 'pending'
                        ? 'Chờ xử lý'
                        : order.status === 'completed'
                        ? 'Hoàn thành'
                        : order.status === 'cancelled'
                        ? 'Đã hủy'
                        : 'Không xác định'}
                    </span>
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="outline" className="hover:bg-green-100">Xem</Button>
                    <Button variant="destructive">Xóa</Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Orders;