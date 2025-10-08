import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import QRViewer from '../../components/ui/QRViewer';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';

const Trace = () => {
  const wallet = useWallet();
  const txId = 'mock-tx-id'; // Từ backend

  return (
    <DashboardLayout role="farmer">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-6 text-primary flex items-center">
          <Search className="w-8 h-8 mr-2 text-green-600" />
          Quản lý truy xuất nguồn gốc
        </h1>
        <Card className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-green-200 dark:border-green-700">
          <CardContent className="text-center">
            {wallet.connected ? (
              <>
                <p className="text-lg font-semibold mb-4">Mã giao dịch: {txId}</p>
                <div className="mx-auto w-48 h-48">
                  <QRViewer value={`https://solscan.io/tx/${txId}?cluster=devnet`} />
                </div>
                <p className="mt-4 text-gray-600 dark:text-gray-300">Quét QR để xem chi tiết trên Solscan.</p>
              </>
            ) : (
              <p className="text-red-500">Vui lòng kết nối ví để xem thông tin.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default Trace;