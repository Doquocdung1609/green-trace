import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { motion } from 'framer-motion';

const mockUsers = [
  { id: 1, email: 'farmer1@mail.com', role: 'farmer' },
  { id: 2, email: 'customer1@mail.com', role: 'customer' },
  { id: 3, email: 'admin@mail.com', role: 'admin' },
];

const Users = () => (
  <DashboardLayout role="admin">
    <motion.h1
      className="text-3xl font-bold mb-6 text-green-700 dark:text-green-400"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      👥 User Management
    </motion.h1>

    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockUsers.map((user) => (
            <TableRow key={user.id} className="hover:bg-green-50 dark:hover:bg-gray-700 transition">
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
              <TableCell>
                <Button variant="outline" className="hover:bg-green-100">
                  Toggle Role
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </DashboardLayout>
);

export default Users;
