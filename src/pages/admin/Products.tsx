import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { motion } from 'framer-motion';

const mockProducts = [
  { id: 1, name: 'Organic Coffee', farmer: 'Farmer A', status: 'Pending' },
  { id: 2, name: 'Fresh Mango', farmer: 'Farmer B', status: 'Approved' },
];

const Products = () => (
  <DashboardLayout role="admin">
    <motion.h1
      className="text-3xl font-bold mb-6 text-green-700 dark:text-green-400"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      🧺 Product Approval
    </motion.h1>

    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Farmer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockProducts.map((p) => (
            <TableRow key={p.id} className="hover:bg-green-50 dark:hover:bg-gray-700 transition">
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.farmer}</TableCell>
              <TableCell
                className={`font-medium ${
                  p.status === 'Approved' ? 'text-green-600' : 'text-yellow-500'
                }`}
              >
                {p.status}
              </TableCell>
              <TableCell>
                {p.status === 'Pending' && (
                  <Button variant="outline" className="hover:bg-green-100">
                    Approve
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </DashboardLayout>
);

export default Products;
