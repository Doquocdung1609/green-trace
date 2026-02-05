import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { useCurrentAccount, useCurrentWallet, useSuiClient, ConnectButton } from '@mysten/dapp-kit';
import { motion } from 'framer-motion';
import { Leaf, CheckCircle2, RefreshCw, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '../../hooks/use-toast';

const PACKAGE_ID = '0xcf09b3fc7338516dd465a4dcfccbc6e9cfa875e730aa9d7e84c3dc5f13f14e73';

interface NFTData {
  id: string;
  owner: string;
  name: string;
  description: string;
  image_url: string;
  origin: string;
  farmer_name: string;
  production_date: string;
  age: number;
  price: number;
  quantity: number;
  roi: number;
  growth_rate: number;
  iot_status: string;
  iot_height: number;
  iot_growth_per_month: number;
  iot_humidity: number;
  iot_temperature: number;
  iot_ph: number;
  iot_last_updated: string;
  certifications_uri: string;
  timeline_uri: string;
  packageId: string;
  moduleName: string;
}

const Products: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const suiClient = useSuiClient();
  const [ownedNFTs, setOwnedNFTs] = useState<NFTData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch owned NFTs when wallet connects
  useEffect(() => {
    if (connectionStatus === 'connected' && currentAccount?.address) {
      fetchOwnedNFTs();
    } else {
      setOwnedNFTs([]);
    }
  }, [connectionStatus, currentAccount?.address]);

  const fetchOwnedNFTs = async () => {
    if (!currentAccount?.address) return;

    setIsLoading(true);
    try {
      console.log('Fetching NFTs for wallet:', currentAccount.address);
      
      // Get all objects owned by wallet
      const objects = await suiClient.getOwnedObjects({
        owner: currentAccount.address,
        options: {
          showContent: true,
          showType: true,
        },
      });

      console.log('Total objects found:', objects.data.length);
      
      // Filter ProductNFT objects (only product_nft_v2)
      const nfts: NFTData[] = [];
      
      for (const obj of objects.data) {
        const objType = obj.data?.type;
        
        // Check if this is a ProductNFT from product_nft_v2 module only
        const isProductNFT = objType && objType.includes('::product_nft_v2::ProductNFT');
        
        if (isProductNFT && obj.data?.content) {
          try {
            const content = obj.data.content as any;
            const fields = content.fields;

            // Extract package ID and module name from type
            const typeMatch = objType!.match(/^(0x[a-f0-9]+)::([^:]+)::/);
            const packageId = typeMatch ? typeMatch[1] : PACKAGE_ID;
            const moduleName = typeMatch ? typeMatch[2] : 'advanced_product_nft';

            // Parse owner - handle both string and object format
            let ownerAddress = '';
            if (typeof fields.owner === 'string') {
              ownerAddress = fields.owner;
            } else if (fields.owner && typeof fields.owner === 'object') {
              // Owner might be an object with an 'id' or 'address' field
              ownerAddress = (fields.owner as any).id || (fields.owner as any).address || '';
            }
            
            // If owner is undefined/empty, NFT is owned by wallet (since it's in getOwnedObjects)
            if (!ownerAddress && currentAccount?.address) {
              ownerAddress = currentAccount.address;
            }

            nfts.push({
              id: obj.data.objectId,
              owner: ownerAddress,
              name: fields.name,
              description: fields.description,
              image_url: fields.image_url,
              origin: fields.origin,
              farmer_name: fields.farmer_name,
              production_date: fields.production_date,
              age: parseInt(fields.age),
              price: parseInt(fields.price || fields.base_price || 0),
              quantity: parseInt(fields.quantity || 1),
              roi: parseInt(fields.roi),
              growth_rate: parseInt(fields.growth_rate),
              iot_status: fields.iot_status,
              iot_height: parseInt(fields.iot_height),
              iot_growth_per_month: parseInt(fields.iot_growth_per_month || 0),
              iot_humidity: parseInt(fields.iot_humidity),
              iot_temperature: parseInt(fields.iot_temperature),
              iot_ph: parseInt(fields.iot_ph),
              iot_last_updated: fields.iot_last_updated,
              certifications_uri: fields.certifications_uri,
              timeline_uri: fields.timeline_uri,
              packageId,
              moduleName,
            });
            
            console.log('Found ProductNFT:', fields.name, 'Module:', moduleName);
          } catch (error) {
            console.error('Error parsing NFT:', error);
          }
        }
      }

      console.log('Total ProductNFTs found:', nfts.length);
      setOwnedNFTs(nfts);

      if (nfts.length === 0) {
        toast({
          title: 'Thông báo',
          description: 'Bạn chưa có NFT nào trong ví. Hãy mint NFT trước!',
        });
      } else {
        toast({
          title: 'Thành công',
          description: `Tìm thấy ${nfts.length} NFT trong ví của bạn`,
        });
      }
    } catch (error: any) {
      console.error('Error loading NFTs:', error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tải danh sách NFT',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Wallet not connected
  if (connectionStatus !== 'connected') {
    return (
      <DashboardLayout role="farmer">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-6"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center border border-green-200 dark:border-green-700">
            <Wallet className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold mb-4">Kết nối ví để xem NFT</h2>
            <p className="text-gray-500 mb-6">Vui lòng kết nối ví Sui để xem danh sách NFT của bạn</p>
            <ConnectButton />
          </div>
        </motion.div>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout role="farmer">
        <p className="p-6 text-center">Đang tải NFT từ ví...</p>
      </DashboardLayout>
    );
  }

  const availableProducts = ownedNFTs;

  return (
    <DashboardLayout role="farmer">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-primary flex items-center">
            <Leaf className="w-8 h-8 mr-2 text-green-600" />
            NFT trong ví của bạn
          </h1>
          <div className="flex gap-2">
            <Button 
              onClick={fetchOwnedNFTs} 
              variant="outline"
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button asChild className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
              <Link to="/farmer/add-product">Tạo NFT mới</Link>
            </Button>
          </div>
        </div>

        {availableProducts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center border border-green-200 dark:border-green-700">
            <Leaf className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-gray-500">Chưa có NFT nào trong ví</p>
            <p className="text-gray-400 mt-2">Hãy tạo NFT mới để bắt đầu bán sản phẩm.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-green-200 dark:border-green-700 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-50 dark:bg-gray-700">
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead>Giá (SUI)</TableHead>
                  <TableHead>Số lượng</TableHead>
                  <TableHead>NFT ID</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableProducts.map((nft) => (
                  <motion.tr
                    key={nft.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-green-50 dark:hover:bg-gray-700 transition"
                  >
                    <TableCell className="font-medium">{nft.name}</TableCell>
                    <TableCell>{(nft.price / 1000000).toFixed(2)} SUI</TableCell>
                    <TableCell>{nft.quantity}</TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-gray-500">
                        {nft.id.slice(0, 8)}...{nft.id.slice(-6)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-xs text-green-700">
                          NFT on-chain
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button 
                        asChild 
                        variant="outline" 
                        size="sm" 
                        className="hover:bg-green-100"
                      >
                        <Link to="/farmer/update-nft">
                          🔗 Cập nhật Blockchain
                        </Link>
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Products;