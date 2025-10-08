import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { motion } from 'framer-motion';

const mockTxs = [
  { id: 1, hash: '5B9kP...xYz1', amount: '2 SOL', link: 'https://solscan.io/tx/5B9kP...xYz1' },
  { id: 2, hash: '7T6vN...qWc3', amount: '1.5 SOL', link: 'https://solscan.io/tx/7T6vN...qWc3' },
];

const Transactions = () => (
  <DashboardLayout role="admin">
    <motion.h1
      className="text-3xl font-bold mb-6 text-green-700 dark:text-green-400"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      💸 Transactions
    </motion.h1>

    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hash</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Explorer</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockTxs.map((tx) => (
            <TableRow key={tx.id} className="hover:bg-green-50 dark:hover:bg-gray-700 transition">
              <TableCell>{tx.hash}</TableCell>
              <TableCell>{tx.amount}</TableCell>
              <TableCell>
                <a href={tx.link} target="_blank" className="text-green-600 hover:underline">
                  View on Solscan
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </DashboardLayout>
);

export default Transactions;
