import { motion } from 'framer-motion';
import { Parallax } from 'react-parallax';
import { Link } from 'react-router-dom';
import Lottie from 'lottie-react';
import leafAnim from '../../assets/leaves.json';
import Header from '../../components/ui/Header';
import Footer from '../../components/ui/Footer';
import ProductCard from '../../components/ui/ProductCard';
import CarbonCard from '../../components/ui/CarbonCard';
import { fetchProducts, fetchCarbonCredits } from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { Cpu, Coins, Satellite, Cloud, Leaf } from 'lucide-react';
import type { Product, CarbonCredit } from '../../types/types';

const Home = () => {
  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const { data: carbonCredits, isLoading: loadingCarbon, isError: errorCarbon } = useQuery({
    queryKey: ['carbonCredits'],
    queryFn: fetchCarbonCredits,
  });

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800 transition-all">
      <Header />

      {/* 🚀 Hero Section */}
      <Parallax
        bgImage="https://images.unsplash.com/photo-1616627989736-25a64b1b3d70?auto=format&fit=crop&w=1600&q=80"
        strength={400}
      >
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative text-white py-32 px-6 text-center bg-green-600/70 backdrop-blur-md"
        >
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <Lottie animationData={leafAnim} loop />
          </div>

          <motion.h1
            className="text-6xl font-bold mb-4 drop-shadow-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            GreenTrace 2.0 🌱
          </motion.h1>
          <p className="text-lg md:text-xl font-medium mb-8">
            Tokenized Sustainable Assets – Đầu tư sinh học, minh bạch tăng trưởng bằng IoT & Blockchain Solana
          </p>
          <motion.a
            href="/market"
            whileHover={{ scale: 1.05 }}
            className="inline-block bg-white text-green-700 font-semibold px-8 py-3 rounded-full shadow-lg hover:bg-green-100 transition"
          >
            Khám phá tài sản sinh học
          </motion.a>
        </motion.section>
      </Parallax>

      {/* ⚙️ Features */}
      <section className="py-20 px-6 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 text-center">
          {[
            {
              icon: <Leaf className="w-12 h-12 mx-auto text-green-600 mb-4" />,
              title: 'IoT Growth Tracking',
              desc: 'Theo dõi sinh trưởng tài sản sinh học theo thời gian thực qua cảm biến IoT.',
            },
            {
              icon: <Coins className="w-12 h-12 mx-auto text-green-600 mb-4" />,
              title: 'NFT Ownership',
              desc: 'Tài sản được mã hóa thành NFT – đảm bảo quyền sở hữu minh bạch và giao dịch được trên Solana.',
            },
            {
              icon: <Cpu className="w-12 h-12 mx-auto text-green-600 mb-4" />,
              title: 'Smart Yield & DeFi Integration',
              desc: 'Đầu tư sinh lời từ tăng trưởng sinh học, carbon yield và staking sinh thái.',
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

      {/* 💠 BioAsset Grid */}
      <section className="p-6 max-w-7xl mx-auto flex-grow">
        <h2 className="text-3xl font-bold mb-8 text-center text-green-700 dark:text-green-400">
          🌿 BioAssets tiềm năng
        </h2>
        {isLoading ? (
          <p className="text-center">Đang tải danh sách tài sản...</p>
        ) : isError ? (
          <p className="text-center text-red-500">Lỗi khi tải BioAsset</p>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.15 }}
          >
            {products?.slice(0, 4).map((product: Product) => (
              <motion.div key={product.id}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* 🌍 Carbon Credit Section */}
      <section className="p-6 max-w-7xl mx-auto flex-grow bg-green-50 dark:bg-gray-800 rounded-2xl my-10">
        <h2 className="text-3xl font-bold mb-8 text-center text-green-700 dark:text-green-400 flex items-center justify-center gap-2">
          <Cloud className="w-8 h-8 text-green-600" /> Dự án Carbon Yield
        </h2>
        {loadingCarbon ? (
          <p className="text-center">Đang tải dự án carbon...</p>
        ) : errorCarbon ? (
          <p className="text-center text-red-500">Lỗi khi tải tín chỉ carbon</p>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.15 }}
          >
            {carbonCredits?.slice(0, 4).map((credit: CarbonCredit) => (
              <motion.div key={credit.id}>
                <Link to={`/carbon-credit/${credit.id}`}>
                  <CarbonCard credit={credit} />
                </Link>
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
        <h3 className="text-2xl font-semibold mb-4">Bắt đầu hành trình đầu tư sinh học 🌳</h3>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          Trở thành nhà đầu tư đầu tiên của tài sản tự nhiên minh bạch, sinh lời bền vững.
        </p>
        <a
          href="/register"
          className="bg-green-700 text-white px-8 py-3 rounded-full font-medium shadow hover:bg-green-800 transition-all"
        >
          Đăng ký ngay
        </a>
      </motion.section>

      <Footer />
    </div>
  );
};

export default Home;