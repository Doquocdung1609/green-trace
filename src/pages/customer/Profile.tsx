import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";

type NFTItem = {
  id: string;
  name: string;
  category: string;
  farmer: string;
  price: number;
  magicEdenUrl: string;
};

const mockNFTs: NFTItem[] = [
  {
    id: "1",
    name: "Sâm Ngọc Linh 5 năm",
    category: "Sâm",
    farmer: "Nguyễn Văn A",
    price: 5000000,
    magicEdenUrl: "https://magiceden.io/marketplace/1",
  },
  {
    id: "2",
    name: "Nấm Linh Chi VIP",
    category: "Nấm",
    farmer: "Trần Thị B",
    price: 3500000,
    magicEdenUrl: "https://magiceden.io/marketplace/2",
  },
];

const InvestorProfile = () => {
  const [nfts, setNFTs] = useState<NFTItem[]>([]);

  // Giả lập lấy dữ liệu từ backend / blockchain
  useEffect(() => {
    setNFTs(mockNFTs);
  }, []);

  return (
    <div className="min-h-screen bg-green-50 dark:bg-gray-900 p-6">
      <motion.h1
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-green-700 dark:text-green-400 mb-6"
      >
        Hồ sơ nhà đầu tư
      </motion.h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md">
        <h2 className="text-xl font-semibold mb-4">Ví Solana</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Địa chỉ ví: <span className="font-mono">ABC123XYZ456...</span>
        </p>

        <h2 className="text-xl font-semibold mb-4 mt-6">NFT đang nắm giữ</h2>
        {nfts.length === 0 ? (
          <p className="text-gray-500">Chưa có NFT nào.</p>
        ) : (
          <div className="space-y-3">
            {nfts.map((nft) => (
              <div
                key={nft.id}
                className="flex justify-between items-center p-4 bg-green-50 dark:bg-gray-700 rounded-xl shadow"
              >
                <div>
                  <p className="font-semibold">{nft.name} ({nft.category})</p>
                  <p className="text-sm text-gray-500">Farmer: {nft.farmer}</p>
                  <p className="text-green-600 font-medium">{nft.price.toLocaleString("vi-VN")} VNĐ</p>
                </div>
                <a
                  href={nft.magicEdenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Xem trên Magic Eden
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestorProfile;
