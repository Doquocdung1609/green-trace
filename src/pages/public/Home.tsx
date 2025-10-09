import { motion } from 'framer-motion';
import { Parallax } from 'react-parallax';
import Lottie from 'lottie-react';
import leafAnim from '../../assets/leaves.json';
import Header from '../../components/ui/Header';
import Footer from '../../components/ui/Footer';
import ProductCard from '../../components/ui/ProductCard';
import { fetchProducts } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { Leaf, ShoppingBag, ShieldCheck } from 'lucide-react';

const Home = () => {
  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 transition-all">
      <Header />

      {/* 🌤 Parallax Hero Section */}
      <Parallax
        bgImage="https://images.unsplash.com/photo-1616627989736-25a64b1b3d70?auto=format&fit=crop&w=1400&q=80"
        strength={400}
      >
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative text-white py-32 px-6 text-center bg-green-600/70 backdrop-blur-md"
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <Lottie animationData={leafAnim} loop />
          </div>

          <motion.h1
            className="text-6xl font-bold mb-4 drop-shadow-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            GreenTrace 🌿
          </motion.h1>
          <p className="text-lg md:text-xl font-medium mb-8">
            Minh bạch chuỗi cung ứng nông sản bằng công nghệ Solana Blockchain
          </p>
          <motion.a
            href="/market"
            whileHover={{ scale: 1.05 }}
            className="inline-block bg-white text-green-700 font-semibold px-8 py-3 rounded-full shadow-lg hover:bg-green-100 transition"
          >
            Khám phá thị trường
          </motion.a>
        </motion.section>
      </Parallax>

      {/* 🌾 Features */}
      <section className="py-16 px-6 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 text-center">
          {[
            {
              icon: <Leaf className="w-12 h-12 mx-auto text-green-600 mb-4" />,
              title: 'Nông sản hữu cơ',
              desc: 'Sản phẩm được trồng theo quy trình VietGAP chuẩn mực.',
            },
            {
              icon: <ShieldCheck className="w-12 h-12 mx-auto text-green-600 mb-4" />,
              title: 'Truy xuất nguồn gốc',
              desc: 'Đảm bảo minh bạch bằng QR blockchain trên từng sản phẩm.',
            },
            {
              icon: <ShoppingBag className="w-12 h-12 mx-auto text-green-600 mb-4" />,
              title: 'Mua sắm an toàn',
              desc: 'Kết nối trực tiếp giữa người nông dân và người tiêu dùng.',
            },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -8 }}
              className="p-8 bg-green-50 dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all"
            >
              {item.icon}
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 🛒 Product Grid */}
      <section className="p-6 max-w-7xl mx-auto flex-grow">
        <h2 className="text-3xl font-bold mb-8 text-center text-green-700 dark:text-green-400">
          🌾 Sản phẩm nổi bật
        </h2>
        {isLoading ? (
          <p className="text-center">Đang tải sản phẩm...</p>
        ) : isError ? (
          <p className="text-center text-red-500">Lỗi khi tải sản phẩm</p>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.15 }}
          >
            {products?.map((product) => (
              <motion.div key={product.id}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* CTA Section */}
      <motion.section
        className="text-center py-20 bg-gradient-to-r from-green-100 to-green-200 dark:from-green-800 dark:to-green-700"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <h3 className="text-2xl font-semibold mb-4">Gia nhập hành trình nông nghiệp bền vững 🌱</h3>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          Cùng GreenTrace tạo nên chuỗi cung ứng minh bạch và đáng tin cậy.
        </p>
        <a
          href="/register"
          className="bg-green-600 text-white px-8 py-3 rounded-full font-medium shadow hover:bg-green-700 transition-all"
        >
          Đăng ký ngay
        </a>
      </motion.section>

      <Footer />
    </div>
  );
};

export default Home;
