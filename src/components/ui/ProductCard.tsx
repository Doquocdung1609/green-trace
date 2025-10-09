import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from './card';
import { Button } from './button';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  origin: string;
}

const ProductCard = ({ product }: { product: Product }) => (
  <motion.div
    whileHover={{ scale: 1.04 }}
    transition={{ duration: 0.3 }}
    className="group relative"
  >
    <Card className="w-full max-w-sm backdrop-blur-lg bg-white/70 dark:bg-gray-800/60 border border-green-200 dark:border-green-700 shadow-md rounded-2xl overflow-hidden transition-all hover:shadow-xl">
      <CardHeader className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 bg-green-600 text-white text-xs px-3 py-1 rounded-full shadow">
          Nông sản sạch
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-3 text-center">
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
          {product.name}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Xuất xứ: {product.origin}
        </p>
        <p className="text-2xl font-bold text-green-600">
          {product.price.toLocaleString('vi-VN')} VNĐ/kg
        </p>
        <Link to={`/product/${product.id}`}>
          <Button className="mt-2 w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium rounded-full">
            <Leaf className="w-4 h-4 mr-2" /> Xem chi tiết
          </Button>
        </Link>
      </CardContent>
    </Card>
  </motion.div>
);

export default ProductCard;
