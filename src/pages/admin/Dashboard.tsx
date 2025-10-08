import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { motion } from 'framer-motion';
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent } from '../../components/ui/card';
import { Users, Package, DollarSign } from 'lucide-react';

const COLORS = ['#22c55e', '#16a34a', '#15803d', '#86efac'];

const data = [
  { name: 'Farmers', value: 400 },
  { name: 'Customers', value: 300 },
  { name: 'Pending KYC', value: 100 },
  { name: 'Others', value: 50 },
];

const stats = [
  { icon: <Users className="text-green-600 w-8 h-8" />, label: 'Total Users', value: '850' },
  { icon: <Package className="text-green-600 w-8 h-8" />, label: 'Total Products', value: '120' },
  { icon: <DollarSign className="text-green-600 w-8 h-8" />, label: 'Revenue', value: '45M VNĐ' },
];

const AdminDashboard = () => (
  <DashboardLayout role="admin">
    <motion.h1
      className="text-4xl font-bold mb-8 text-green-700 dark:text-green-400"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      🌿 Admin Dashboard
    </motion.h1>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      {stats.map((item, idx) => (
        <motion.div key={idx} whileHover={{ y: -6 }} className="rounded-2xl shadow bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center gap-4">
            {item.icon}
            <div>
              <p className="text-gray-500">{item.label}</p>
              <h3 className="text-2xl font-semibold">{item.value}</h3>
            </div>
          </div>
        </motion.div>
      ))}
    </div>

    <Card className="p-6 rounded-2xl bg-white dark:bg-gray-800 shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-green-700 dark:text-green-400">User Distribution</h2>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie dataKey="value" data={data} outerRadius={100} label>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  </DashboardLayout>
);

export default AdminDashboard;
