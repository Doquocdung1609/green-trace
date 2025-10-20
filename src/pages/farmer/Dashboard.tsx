import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '../../components/ui/card';
import { motion } from 'framer-motion';
import { Leaf, ShoppingBag, DollarSign } from 'lucide-react';

const data = [
  { name: 'Jan', sales: 4000 },
  { name: 'Feb', sales: 3000 },
  { name: 'Mar', sales: 5000 },
  // ... thêm dữ liệu
];

const FarmerDashboard = () => (
  <DashboardLayout role="farmer">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-3xl font-bold mb-6 text-primary flex items-center">
        <Leaf className="w-8 h-8 mr-2 text-green-600" />
        Dashboard Nông dân
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { icon: Leaf, title: 'Tổng NFT', value: '10' },
          { icon: ShoppingBag, title: 'NFT đã bán', value: '5' },
          { icon: DollarSign, title: 'Doanh thu', value: '10M VND' },
        ].map((item, idx) => (
          <motion.div key={idx} whileHover={{ scale: 1.05 }} transition={{ duration: 0.3 }}>
            <Card className="bg-green-50 dark:bg-gray-800 border border-green-200 dark:border-green-700 shadow-md">
              <CardContent className="p-6 text-center">
                <item.icon className="w-10 h-10 mx-auto mb-2 text-green-600" />
                <p className="text-xl font-semibold">{item.value}</p>
                <p className="text-gray-600 dark:text-gray-300">{item.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      <Card className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-green-200 dark:border-green-700">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="sales" fill="#22c55e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </motion.div>
  </DashboardLayout>
);

export default FarmerDashboard;