import Header from "../../components/ui/Header";
import Footer from "../../components/ui/Footer";
import { motion } from "framer-motion";

const About = () => (
  <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
    <Header />
    <section className="max-w-5xl mx-auto px-6 py-16 text-center">
      <motion.h1
        className="text-4xl font-bold text-green-700 dark:text-green-400 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Về GreenTrace 🌿
      </motion.h1>
      <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-10">
        GreenTrace là nền tảng minh bạch hóa chuỗi cung ứng nông sản bằng công nghệ Solana Blockchain. 
        Chúng tôi giúp người tiêu dùng hiểu rõ nguồn gốc sản phẩm và hỗ trợ nông dân xây dựng thương hiệu bền vững.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -8 }} className="p-6 rounded-xl shadow bg-white dark:bg-gray-800">
          <h3 className="text-xl font-semibold mb-2">🌾 Sứ mệnh</h3>
          <p>Minh bạch và công bằng trong chuỗi cung ứng nông sản.</p>
        </motion.div>
        <motion.div whileHover={{ y: -8 }} className="p-6 rounded-xl shadow bg-white dark:bg-gray-800">
          <h3 className="text-xl font-semibold mb-2">💡 Tầm nhìn</h3>
          <p>Trở thành nền tảng truy xuất nguồn gốc hàng đầu Đông Nam Á.</p>
        </motion.div>
        <motion.div whileHover={{ y: -8 }} className="p-6 rounded-xl shadow bg-white dark:bg-gray-800">
          <h3 className="text-xl font-semibold mb-2">🤝 Giá trị</h3>
          <p>Minh bạch – Tin cậy – Bền vững.</p>
        </motion.div>
      </div>
    </section>
    <Footer />
  </div>
);

export default About;
