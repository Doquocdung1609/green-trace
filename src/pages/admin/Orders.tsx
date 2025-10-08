import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { motion } from 'framer-motion';

const mockOrders = [
  { id: 1, customer: 'Customer A', product: 'Coffee', total: '500K VNĐ', status: 'Delivered' },
  { id: 2, customer: 'Customer B', product: 'Mango', total: '300K VNĐ', status: 'Pending' },
];

const AdminOrders = () => (
  <DashboardLayout role="admin">
    <motion.h1
      className="text-3xl font-bold mb-6 text-green-700 dark:text-green-400"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      🧾 Orders Overview
    </motion.h1>

    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockOrders.map((order) => (
            <TableRow key={order.id} className="hover:bg-green-50 dark:hover:bg-gray-700 transition">
              <TableCell>{order.customer}</TableCell>
              <TableCell>{order.product}</TableCell>
              <TableCell>{order.total}</TableCell>
              <TableCell
                className={`font-medium ${
                  order.status === 'Delivered' ? 'text-green-600' : 'text-yellow-500'
                }`}
              >
                {order.status}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </DashboardLayout>
);

export default AdminOrders;
