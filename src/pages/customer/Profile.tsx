import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";
import { ConnectButton } from "@mysten/dapp-kit";
import { Wallet } from "lucide-react";

type NFTItem = {
  id: string;
  name: string;
  category: string;
  farmer: string;
  price: number;
};

const mockNFTs: NFTItem[] = [
  {
    id: "1",
    name: "Sâm Ngọc Linh 5 năm",
    category: "Sâm",
    farmer: "Nguyễn Văn A",
    price: 5000000,
  },
  {
    id: "2",
    name: "Nấm Linh Chi VIP",
    category: "Nấm",
    farmer: "Trần Thị B",
    price: 3500000,
  },
];

const InvestorProfile = () => {
  const [nfts, setNFTs] = useState<NFTItem[]>([]);

  useEffect(() => {
    setNFTs(mockNFTs);
  }, []);

  return (
    <div className="min-h-screen bg-green-50 dark:bg-gray-900 p-6">
      <motion.h1
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-green-700 dark:text-green-400 mb-8 text-center"
      >
        Hồ sơ nhà đầu tư
      </motion.h1>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Phần thông tin ví */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
            <Wallet className="w-7 h-7 text-green-600" />
            Ví Solana của bạn
          </h2>

          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Kết nối ví Sui của bạn để xem thông tin đầu tư.
            </p>
            <ConnectButton />
          </div>
        </div>

        {/* Phần NFT đang nắm giữ */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-semibold mb-6">NFT nông sản đang sở hữu</h2>

          {nfts.length === 0 ? (
            <p className="text-center text-gray-500 py-10">
              Bạn chưa sở hữu NFT nông sản nào.
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {nfts.map((nft) => (
                <div
                  key={nft.id}
                  className="flex flex-col justify-between p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-700 dark:to-gray-600 rounded-2xl shadow-md hover:shadow-xl transition-shadow"
                >
                  <div>
                    <h3 className="text-xl font-bold text-green-800 dark:text-green-300">
                      {nft.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Danh mục: <span className="font-medium">{nft.category}</span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Farmer: <span className="font-medium">{nft.farmer}</span>
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-4">
                      {nft.price.toLocaleString("vi-VN")} VNĐ
                    </p>
                  </div>

                  <Button
                    asChild
                    className="mt-6 bg-green-600 hover:bg-green-700 text-white rounded-full"
                  >
                    <a href="/shop" target="_blank" rel="noopener noreferrer">
                      Xem chi tiết trên sàn
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestorProfile;