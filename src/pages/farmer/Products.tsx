import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { fetchProducts, deleteProduct } from '../../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/types';

const Products: React.FC = () => {
  const queryClient = useQueryClient();
  
  const { data: products = [], isLoading, error } = useQuery<Product[]>({
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
    if (confirm('Bạn có chắc muốn xóa NFT này?')) {
      del(id);
    }
  };

  if (isLoading) return <p className="p-6 text-center">Đang tải dữ liệu...</p>;
  if (error) return <p className="p-6 text-red-500 text-center">Đã có lỗi xảy ra</p>;

  // LỌC CHỈ HIỂN THỊ NFT CHƯA BÁN (sold !== true)
  const availableProducts = products.filter(product => !product.sold);

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
            Danh sách NFT đang bán
          </h1>
          <Button asChild className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
            <Link to="/farmer/add-product">Tạo NFT mới</Link>
          </Button>
        </div>

        {availableProducts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center border border-green-200 dark:border-green-700">
            <Leaf className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-gray-500">Chưa có NFT nào đang bán</p>
            <p className="text-gray-400 mt-2">Tất cả NFT đã được bán hoặc chưa tạo.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-green-200 dark:border-green-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-50 dark:bg-gray-700">
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead>Giá (VNĐ)</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableProducts.map((product) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-green-50 dark:hover:bg-gray-700 transition"
                  >
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.price.toLocaleString('vi-VN')} ₫</TableCell>
                    <TableCell>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        Đang bán
                      </span>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button asChild variant="outline" size="sm" className="hover:bg-green-100">
                        <Link to={`/farmer/edit-product/${product.id}`}>Sửa</Link>
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDelete(product.id)}
                      >
                        Xóa
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Products;