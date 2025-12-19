// components/ui/ProductCard.tsx
import { Link } from "react-router-dom";
import type { Product } from "../../types/types";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <Link to={`/product/${product.id}`} className="block">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <div className="p-4">
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
            {product.name}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
            {product.origin}
          </p>
          <p className="text-amber-600 dark:text-amber-400 font-bold mt-2">
            {product.price.toLocaleString("vi-VN")} VNĐ
          </p>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;