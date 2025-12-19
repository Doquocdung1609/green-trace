import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import type { Order, Product } from '../../types/types';

// API functions
const fetchOrders = async (): Promise<Order[]> => {
  const response = await fetch('http://localhost:3000/api/orders');
  if (!response.ok) throw new Error('Lỗi tải đơn hàng');
  return response.json();
};

const fetchProducts = async (): Promise<Product[]> => {
  const response = await fetch('http://localhost:3000/api/products');
  if (!response.ok) throw new Error('Lỗi tải sản phẩm');
  return response.json();
};

const updateOrderStatus = async ({ id, status }: { id: string; status: string }) => {
  const response = await fetch(`http://localhost:3000/api/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Cập nhật trạng thái thất bại');
  return response.json();
};

const OrdersFarmer: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ['farmerOrders'],
    queryFn: fetchOrders,
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ['farmerProducts'],
    queryFn: fetchProducts,
  });

  const updateMutation = useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmerOrders'] });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" /> Chờ xác nhận</Badge>;
      case 'confirmed':
        return <Badge variant="default" className="bg-blue-500 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Đã xác nhận</Badge>;
      case 'shipping':
        return <Badge variant="default" className="bg-orange-500 flex items-center gap-1"><Truck className="w-3 h-3" /> Đang giao</Badge>;
      case 'delivered':
        return <Badge variant="default" className="bg-green-600 flex items-center gap-1"><Package className="w-3 h-3" /> Đã giao</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStatusChange = (orderId: string, newStatus: string) => {
    updateMutation.mutate({ id: orderId, status: newStatus });
  };

  if (loadingOrders || loadingProducts) {
    return <p className="p-6 text-center text-gray-600">Đang tải dữ liệu...</p>;
  }

  return (
    <DashboardLayout role="farmer">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6"
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-green-700 dark:text-green-400 flex items-center gap-3">
            <Package className="w-9 h-9" />
            Quản lý đơn hàng
          </h1>
          <div className="text-lg text-gray-600">
            Tổng: <span className="font-bold text-green-600">{orders.length}</span> đơn hàng
          </div>
        </div>

        {orders.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden border border-green-200 dark:border-green-700 shadow-md hover:shadow-xl transition">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">Đơn hàng #{order.id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Ngày đặt: {new Date(order.date).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Thông tin khách hàng</h3>
                      <p><strong>Họ tên:</strong> {order.customerName}</p>
                      <p><strong>SĐT:</strong> {order.phone}</p>
                      <p><strong>Địa chỉ:</strong> {order.address}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Tổng thanh toán</h3>
                      <p className="text-2xl font-bold text-green-600">
                        {order.total.toLocaleString('vi-VN')} ₫
                      </p>
                      <p className="text-sm text-gray-500">Đã thanh toán bằng SOL</p>
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-700 mb-3">Sản phẩm trong đơn</h3>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 dark:bg-gray-800">
                        <TableHead>Sản phẩm</TableHead>
                        <TableHead>Giá</TableHead>
                        <TableHead>Loại mua</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item, idx) => {
                        let product = products.find((p: Product) => p.id === item.productId);

                        const fallbackName = `Sản phẩm ID: ${item.productId}`;
                        return (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {product?.name || 'Sản phẩm không tồn tại'}
                            </TableCell>
                            <TableCell>{item.price.toLocaleString('vi-VN')} ₫</TableCell>
                            <TableCell>
                              <Badge variant={item.buyType === 'dut' ? 'destructive' : 'default'}>
                                {item.buyType === 'dut' ? 'Mua đứt (Burn NFT)' : 'Mua dài hạn'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="mt-6 flex justify-end items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Cập nhật trạng thái:</span>
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleStatusChange(order.id, value)}
                      disabled={updateMutation.isPending}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Chờ xác nhận</SelectItem>
                        <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                        <SelectItem value="shipping">Đang giao hàng</SelectItem>
                        <SelectItem value="delivered">Đã giao hàng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-gray-500">Chưa có đơn hàng nào</p>
            <p className="text-gray-400 mt-2">Khi nhà đầu tư thanh toán bằng SOL, đơn hàng sẽ xuất hiện ở đây.</p>
          </Card>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default OrdersFarmer;