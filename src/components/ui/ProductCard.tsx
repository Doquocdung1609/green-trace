import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from './card';
import { Button } from './button';
import { Link } from 'react-router-dom';
import { TrendingUp, Activity, Leaf } from 'lucide-react';
import type { Product } from '../../types/types';

const ProductCard = ({ product }: { product: Product }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    transition={{ duration: 0.25 }}
    className="group relative flex flex-col"
  >
    <Card className="flex flex-col h-full backdrop-blur-xl bg-gradient-to-br from-green-50 to-white dark:from-gray-900 dark:to-gray-800 border border-green-200 dark:border-green-700 shadow-md rounded-2xl overflow-hidden hover:shadow-2xl transition-all">
      {/* --- Hình ảnh & Tag --- */}
      <CardHeader className="relative p-0">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-56 object-cover rounded-t-2xl transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 bg-green-700 text-white text-xs px-3 py-1 rounded-full shadow">
          BioAsset Premium
        </div>
        <div className="absolute bottom-3 right-3 bg-white/90 text-green-700 text-xs font-semibold px-3 py-1 rounded-full shadow flex items-center gap-1">
          <Activity className="w-4 h-4" />
          IoT: {product.iotStatus}
        </div>
      </CardHeader>

      {/* --- Nội dung chính --- */}
      <CardContent className="flex flex-col flex-grow justify-between p-5 text-center">
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-green-800 dark:text-green-300 leading-snug min-h-[56px] flex items-center justify-center line-clamp-2">
            {product.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug min-h-[40px] flex items-center justify-center">
            Xuất xứ: {product.origin} — Tuổi: {product.age} năm
          </p>
          <p className="text-sm text-green-600 dark:text-green-400 font-medium min-h-[28px] flex items-center justify-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Tăng trưởng: {product.growthRate}%/năm
          </p>
          <p className="text-lg font-bold text-green-700 dark:text-green-400 min-h-[48px] flex items-center justify-center">
            {product.price.toLocaleString('vi-VN')} VNĐ/đơn vị
          </p>
        </div>

        {/* --- Nút CTA cố định đáy --- */}
        <Link to={`/product/${product.id}`} className="mt-4 block">
          <Button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-full">
            <Leaf className="w-4 h-4 mr-2" /> Xem chi tiết
          </Button>
        </Link>
      </CardContent>
    </Card>
  </motion.div>
);

export default ProductCard;