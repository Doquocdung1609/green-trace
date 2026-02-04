import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useCurrentAccount, useCurrentWallet, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Coins, TrendingUp, ShoppingCart, ExternalLink } from "lucide-react";
import { toast } from "../../hooks/use-toast";

interface NFTListing {
  id: string;
  nftId: string;
  name: string;
  description: string;
  image: string;
  priceSui: number;
  priceUsd: number;
  seller: string;
  age: number;
  growthRate: number;
  iotStatus: string;
}

const NFTMarketplace = () => {
  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [listings, setListings] = useState<NFTListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [suiPrice, setSuiPrice] = useState(3.5); // Default SUI price in USD
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    fetchSuiPrice();
    fetchListings();
  }, []);

  const fetchSuiPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd');
      const data = await response.json();
      if (data.sui?.usd) {
        setSuiPrice(data.sui.usd);
      }
    } catch (error) {
      console.error('Failed to fetch SUI price:', error);
    }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/nft-listings');
      if (!response.ok) throw new Error('Failed to fetch listings');
      
      const data = await response.json();
      setListings(data);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách NFT",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const buyNFT = async (listing: NFTListing) => {
    if (connectionStatus !== 'connected') {
      toast({
        title: "Chưa kết nối ví",
        description: "Vui lòng kết nối ví Sui để mua NFT",
        variant: "destructive"
      });
      return;
    }

    setBuying(listing.id);
    try {
      const tx = new Transaction();
      
      // Step 1: Create payment coin
      const priceInMist = Math.floor(listing.priceSui * 1_000_000_000);
      const [coin] = tx.splitCoins(tx.gas, [priceInMist]);
      
      // Step 2: Transfer payment to seller
      tx.transferObjects([coin], listing.seller);
      
      // Note: NFT transfer from escrow wallet to buyer will be done by backend
      // This requires the marketplace escrow wallet to monitor purchases and transfer NFTs
      
      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: tx as any,
          },
          {
            onSuccess: (result) => {
              if (result.digest) {
                // Step 3: Notify backend about purchase
                const purchaseData = {
                  listingId: listing.id,
                  nftId: listing.nftId,
                  buyer: currentAccount?.address || '',
                  seller: listing.seller,
                  priceSui: listing.priceSui,
                  priceUsd: listing.priceUsd,
                  txDigest: result.digest,
                };

                fetch('http://localhost:3000/api/nft-purchases', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(purchaseData),
                }).then(() => {
                  toast({
                    title: "🎉 Mua NFT thành công!",
                    description: `Transaction: ${result.digest}`,
                  });
                  fetchListings();
                }).catch((error) => {
                  console.error('Error saving purchase:', error);
                });
              }
              resolve(result);
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    } catch (error: any) {
      console.error('Error buying NFT:', error);
      toast({
        title: "Lỗi thanh toán",
        description: error.message || "Đã xảy ra lỗi khi thanh toán",
        variant: "destructive"
      });
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-green-600 to-green-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl font-bold mb-4">NFT Marketplace</h1>
            <p className="text-xl opacity-90">
              Mua và bán NFT tài sản sinh học trên Sui blockchain
            </p>
            <div className="mt-4 flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className="text-sm opacity-80">Giá SUI:</span>
                <span className="ml-2 font-bold">${suiPrice.toFixed(2)}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Listings Section */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-green-700 dark:text-green-400">
            NFT đang bán
          </h2>
          <Button onClick={fetchListings} variant="outline">
            <ExternalLink className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Đang tải NFT...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Chưa có NFT nào được đăng bán
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Hãy quay lại sau hoặc liên hệ nông dân để mua NFT
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="h-full flex flex-col hover:shadow-xl transition-all">
                  <CardHeader className="relative p-0">
                    <img
                      src={listing.image}
                      alt={listing.name}
                      className="w-full h-56 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-3 right-3 bg-green-700 text-white text-xs px-3 py-1 rounded-full">
                      {listing.iotStatus}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col p-6">
                    <CardTitle className="text-xl mb-2 line-clamp-1">
                      {listing.name}
                    </CardTitle>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {listing.description}
                    </p>
                    
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Tuổi:</span>
                        <span className="font-medium">{listing.age} năm</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Tăng trưởng:</span>
                        <span className="font-medium flex items-center">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {listing.growthRate}%/năm
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-2xl font-bold text-green-700 flex items-center">
                            <Coins className="w-6 h-6 mr-2" />
                            {listing.priceSui} SUI
                          </span>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          ≈ ${listing.priceUsd.toFixed(2)} USD
                        </div>
                      </div>

                      <Button
                        onClick={() => buyNFT(listing)}
                        disabled={buying === listing.id || connectionStatus !== 'connected'}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                      >
                        {buying === listing.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                            Đang xử lý...
                          </>
                        ) : connectionStatus !== 'connected' ? (
                          "Kết nối ví để mua"
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Mua ngay
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default NFTMarketplace;
