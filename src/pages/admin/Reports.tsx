import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

const data = [
  { name: 'Jan', revenue: 4000000 },
  { name: 'Feb', revenue: 6000000 },
  { name: 'Mar', revenue: 8000000 },
  { name: 'Apr', revenue: 7000000 },
];

const Reports = () => (
  <DashboardLayout role="admin">
    <motion.h1
      className="text-3xl font-bold mb-6 text-green-700 dark:text-green-400"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      📈 Reports & Analytics
    </motion.h1>

    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="revenue" fill="#22c55e" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </DashboardLayout>
);

export default Reports;
