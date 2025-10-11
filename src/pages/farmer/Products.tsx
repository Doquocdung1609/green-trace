// Products.tsx (updated with edit/delete)
import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { fetchProducts, deleteProduct } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Leaf, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/types';

const Products: React.FC = () => {
  const queryClient = useQueryClient();
  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ['farmerProducts'],
    queryFn: fetchProducts,
  });

  const { mutate: del } = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farmerProducts'] });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      del(id);
    }
  };

  if (isLoading) return <p className="p-6 text-center">Đang tải dữ liệu...</p>;
  if (error) return <p className="p-6 text-red-500 text-center">Đã có lỗi xảy ra</p>;

  return (
    <DashboardLayout role="farmer">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary flex items-center">
            <Leaf className="w-8 h-8 mr-2 text-green-600" />
            Danh sách sản phẩm
          </h1>
          <Button asChild className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
            <Link to="/farmer/add-product">Thêm mới</Link>
          </Button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-green-200 dark:border-green-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-green-50 dark:bg-gray-700">
                <TableHead>Tên</TableHead>
                <TableHead>Giá (VNĐ)</TableHead>
                <TableHead>Số lượng</TableHead>
                <TableHead>Còn hàng</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((product) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="hover:bg-green-50 dark:hover:bg-gray-700 transition"
                >
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.price.toLocaleString('vi-VN')}</TableCell>
                  <TableCell>{product.quantity}</TableCell>
                  <TableCell className="flex gap-2">
                    <Button asChild variant="outline" className="hover:bg-green-100">
                      <Link to={`/farmer/edit-product/${product.id}`}>Sửa</Link>
                    </Button>
                    <Button variant="destructive" onClick={() => handleDelete(product.id)}>Xóa</Button>
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

export default Products;