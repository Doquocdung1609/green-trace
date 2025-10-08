import React from "react";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import { Timeline } from "antd";

const Trace = () => {
  const { productId } = useParams();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      <motion.section
        className="max-w-3xl mx-auto px-6 py-10"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold text-green-700 dark:text-green-400 mb-8">
          🌾 Hành trình sản phẩm #{productId}
        </h1>
        <div className="bg-card rounded-2xl shadow-lg p-6">
          <Timeline mode="left">
            <Timeline.Item color="green">Thu hoạch: 01/10/2025</Timeline.Item>
            <Timeline.Item color="blue">Đóng gói tại Nông trại A</Timeline.Item>
            <Timeline.Item color="gray">Vận chuyển đến Kho B</Timeline.Item>
            <Timeline.Item color="green">Giao cho khách hàng</Timeline.Item>
          </Timeline>
        </div>
      </motion.section>
    </div>
  );
};

export default Trace;
