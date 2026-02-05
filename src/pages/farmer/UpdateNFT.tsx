import { useState, useEffect } from 'react';
import { useCurrentAccount, useCurrentWallet, useSignAndExecuteTransaction, useSuiClient, ConnectButton, useDisconnectWallet } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { motion } from 'framer-motion';
import { RefreshCw, Save, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from '../../hooks/use-toast';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';

const PACKAGE_ID = '0xcf09b3fc7338516dd465a4dcfccbc6e9cfa875e730aa9d7e84c3dc5f13f14e73';
const SUI_CLIENT = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });

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

const UpdateNFT = () => {
  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const { mutate: disconnect } = useDisconnectWallet();
  const [ownedNFTs, setOwnedNFTs] = useState<NFTData[]>([]);
  const [selectedNftId, setSelectedNftId] = useState('');
  const [nftData, setNftData] = useState<NFTData | null>(null);
  const [nftPackageId, setNftPackageId] = useState('');
  const [nftModule, setNftModule] = useState('');
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Form states
  const [iotStatus, setIotStatus] = useState('');
  const [iotHeight, setIotHeight] = useState(0);
  const [iotGrowthPerMonth, setIotGrowthPerMonth] = useState(0);
  const [iotHumidity, setIotHumidity] = useState(0);
  const [iotTemperature, setIotTemperature] = useState(0);
  const [iotPh, setIotPh] = useState(0);
  const [roi, setRoi] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');

  // Fetch owned NFTs when wallet connects
  useEffect(() => {
    if (connectionStatus === 'connected' && currentAccount?.address) {
      fetchOwnedNFTs();
    } else {
      setOwnedNFTs([]);
      setSelectedNftId('');
      setNftData(null);
    }
  }, [connectionStatus, currentAccount?.address]);

  const fetchOwnedNFTs = async () => {
    if (!currentAccount?.address) return;

    setLoading(true);
    try {
      console.log('Fetching NFTs for wallet:', currentAccount!.address);
      
      // Get all objects owned by wallet
      const objects = await suiClient.getOwnedObjects({
        owner: currentAccount!.address,
        options: {
          showContent: true,
          showType: true,
        },
      });

      console.log('Total objects found:', objects.data.length);
      console.log('Raw objects data:', objects.data);
      
      // Filter ProductNFT objects (only product_nft_v2)
      const nfts: NFTData[] = [];
      
      for (const obj of objects.data) {
        const objType = obj.data?.type;
        console.log('Object type:', objType);
        
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
            if (!ownerAddress) {
              ownerAddress = currentAccount!.address;
              console.log('Owner field undefined, using wallet address as owner');
            }

            console.log('NFT Owner field:', fields.owner);
            console.log('Parsed owner address:', ownerAddress);
            console.log('Current wallet:', currentAccount!.address);

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
          description: 'Bạn chưa có NFT nào. Hãy mint NFT trước!',
        });
      } else {
        toast({
          title: 'Thành công',
          description: `Tìm thấy ${nfts.length} NFT trong ví của bạn`,
        });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tải danh sách NFT',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectNFT = (nftId: string) => {
    const nft = ownedNFTs.find(n => n.id === nftId);
    if (!nft) return;

    setSelectedNftId(nftId);
    setNftData(nft);
    setNftPackageId(nft.packageId);
    setNftModule(nft.moduleName);

    // Set form values
    setIotStatus(nft.iot_status);
    setIotHeight(nft.iot_height);
    setIotGrowthPerMonth(nft.iot_growth_per_month);
    setIotHumidity(nft.iot_humidity);
    setIotTemperature(nft.iot_temperature);
    setIotPh(nft.iot_ph / 100);
    setRoi(nft.roi);
    setGrowthRate(nft.growth_rate);
    setPrice(nft.price / 1000000);
    setDescription(nft.description);

    toast({
      title: '✅ Đã chọn NFT',
      description: `${nft.name} (${nft.moduleName})`,
    });
  };

  const fetchNFT = async () => {
    // Refresh selected NFT data after update
    if (!selectedNftId || !currentAccount?.address) return;

    try {
      const object = await SUI_CLIENT.getObject({
        id: selectedNftId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!object.data || !object.data.content) return;

      const content = object.data.content as any;
      const fields = content.fields;

      // Parse owner - handle both string and object format
      let ownerAddress = '';
      if (typeof fields.owner === 'string') {
        ownerAddress = fields.owner;
      } else if (fields.owner && typeof fields.owner === 'object') {
        ownerAddress = (fields.owner as any).id || (fields.owner as any).address || '';
      }
      
      // If owner is undefined/empty, the wallet holding the NFT is the owner
      if (!ownerAddress && currentAccount?.address) {
        ownerAddress = currentAccount.address;
      }

      console.log('Fetched NFT owner:', ownerAddress);

      const data: NFTData = {
        id: selectedNftId,
        owner: ownerAddress,
        name: fields.name || '',
        description: fields.description || '',
        image_url: fields.image_url || '',
        origin: fields.origin || '',
        farmer_name: fields.farmer_name || '',
        production_date: fields.production_date || '',
        age: parseInt(fields.age) || 0,
        price: parseInt(fields.price || fields.base_price || '0') || 0,
        quantity: parseInt(fields.quantity || '1') || 1,
        roi: parseInt(fields.roi) || 0,
        growth_rate: parseInt(fields.growth_rate) || 0,
        iot_status: fields.iot_status || 'active',
        iot_height: parseInt(fields.iot_height) || 0,
        iot_growth_per_month: parseInt(fields.iot_growth_per_month || '0') || 0,
        iot_humidity: parseInt(fields.iot_humidity) || 0,
        iot_temperature: parseInt(fields.iot_temperature) || 0,
        iot_ph: parseInt(fields.iot_ph) || 0,
        iot_last_updated: fields.iot_last_updated || '',
        certifications_uri: fields.certifications_uri || '',
        timeline_uri: fields.timeline_uri || '',
        packageId: nftPackageId,
        moduleName: nftModule,
      };

      setNftData(data);
      
      // Update form values with safe defaults
      setIotStatus(data.iot_status);
      setIotHeight(data.iot_height);
      setIotGrowthPerMonth(data.iot_growth_per_month);
      setIotHumidity(data.iot_humidity);
      setIotTemperature(data.iot_temperature);
      setIotPh(data.iot_ph ? data.iot_ph / 100 : 0);
      setRoi(data.roi);
      setGrowthRate(data.growth_rate);
      setPrice(data.price ? data.price / 1000000 : 0);
      setDescription(data.description);

      toast({
        title: 'Thành công',
        description: 'Đã tải thông tin NFT',
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể tải NFT',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateIotData = async () => {
    if (connectionStatus !== 'connected' || !nftData || !currentAccount?.address) return;

    // Normalize addresses for comparison (lowercase)
    const nftOwner = nftData.owner.toLowerCase();
    const walletAddress = currentAccount.address.toLowerCase();

    console.log('=== Update Permission Check ===');
    console.log('NFT Owner:', nftOwner);
    console.log('Wallet Address:', walletAddress);
    console.log('Match:', nftOwner === walletAddress);

    // Check ownership
    if (nftOwner !== walletAddress) {
      toast({
        title: '❌ Không có quyền',
        description: `Chỉ chủ sở hữu NFT mới có thể cập nhật thông tin.\n\nOwner: ${nftData.owner}\nYour address: ${currentAccount.address}`,
        variant: 'destructive',
      });
      return;
    }

    // Check module compatibility
    if (nftModule !== 'product_nft_v2') {
      toast({
        title: '❌ Module không hỗ trợ',
        description: `Module "${nftModule}" không hỗ trợ cập nhật động. Chỉ NFT từ product_nft_v2 mới có thể cập nhật.`,
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);
    try {
      const txb = new Transaction();

      // product_nft_v2 signature
      const currentTime = new Date().toISOString();
      txb.moveCall({
        target: `${nftPackageId}::product_nft_v2::update_iot_data`,
        arguments: [
          txb.object(nftData.id),
          txb.pure.string(iotStatus),
          txb.pure.u64(iotHeight),
          txb.pure.u64(iotGrowthPerMonth),
          txb.pure.u64(iotHumidity),
          txb.pure.u64(iotTemperature),
          txb.pure.u64(Math.floor(iotPh * 100)), // pH in hundredths
          txb.pure.string(currentTime),
        ],
      });

      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: txb as any,
          },
          {
            onSuccess: (result) => {
              toast({
                title: '✅ Cập nhật IoT thành công!',
                description: `Transaction: ${result.digest}`,
              });
              fetchNFT();
              resolve(result);
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateFinancialData = async () => {
    if (connectionStatus !== 'connected' || !nftData || !currentAccount?.address) return;

    // Normalize addresses for comparison (lowercase)
    const nftOwner = nftData.owner.toLowerCase();
    const walletAddress = currentAccount.address.toLowerCase();

    // Check ownership
    if (nftOwner !== walletAddress) {
      toast({
        title: '❌ Không có quyền',
        description: `Chỉ chủ sở hữu NFT mới có thể cập nhật thông tin.\n\nOwner: ${nftData.owner}\nYour address: ${currentAccount.address}`,
        variant: 'destructive',
      });
      return;
    }

    // Check module compatibility
    if (nftModule !== 'product_nft_v2') {
      toast({
        title: '❌ Module không hỗ trợ',
        description: `Module "${nftModule}" không hỗ trợ cập nhật động. Chỉ NFT từ product_nft_v2 mới có thể cập nhật.`,
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);
    try {
      const txb = new Transaction();

      // product_nft_v2 uses update_financial_data (roi, growth_rate, price)
      txb.moveCall({
        target: `${nftPackageId}::product_nft_v2::update_financial_data`,
        arguments: [
          txb.object(nftData.id),
          txb.pure.u64(roi),
          txb.pure.u64(growthRate),
          txb.pure.u64(Math.floor(price * 1000000)), // price in micro units
        ],
      });

      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: txb as any,
          },
          {
            onSuccess: (result) => {
              toast({
                title: '✅ Cập nhật tài chính thành công!',
                description: `Transaction: ${result.digest}`,
              });
              fetchNFT();
              resolve(result);
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateDescription = async () => {
    if (connectionStatus !== 'connected' || !nftData || !currentAccount?.address) return;

    // Normalize addresses for comparison (lowercase)
    const nftOwner = nftData.owner.toLowerCase();
    const walletAddress = currentAccount.address.toLowerCase();

    // Check ownership
    if (nftOwner !== walletAddress) {
      toast({
        title: '❌ Không có quyền',
        description: `Chỉ chủ sở hữu NFT mới có thể cập nhật thông tin.\n\nOwner: ${nftData.owner}\nYour address: ${currentAccount.address}`,
        variant: 'destructive',
      });
      return;
    }

    // Check module compatibility
    if (nftModule !== 'product_nft_v2') {
      toast({
        title: '❌ Module không hỗ trợ',
        description: `Module "${nftModule}" không hỗ trợ cập nhật động. Chỉ NFT từ product_nft_v2 mới có thể cập nhật.`,
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);
    try {
      const txb = new Transaction();

      txb.moveCall({
        target: `${nftPackageId}::${nftModule}::update_description`,
        arguments: [
          txb.object(nftData.id),
          txb.pure.string(description),
        ],
      });

      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: txb as any,
          },
          {
            onSuccess: (result) => {
              toast({
                title: '✅ Cập nhật mô tả thành công!',
                description: `Transaction: ${result.digest}`,
              });
              fetchNFT();
              resolve(result);
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Lỗi',
        description: error.message || 'Không thể cập nhật',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Cập Nhật NFT</h1>
                <p className="text-gray-600">Cập nhật thông tin NFT sản phẩm nông nghiệp</p>
              </div>
            </div>
            
            {/* Wallet Info */}
            {connectionStatus === 'connected' && currentAccount?.address && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-xs text-gray-600">Ví đang kết nối</p>
                      <p className="text-sm font-mono font-semibold text-gray-900">
                        {currentAccount!.address.slice(0, 6)}...{currentAccount!.address.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => disconnect()}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    Đăng xuất
                  </Button>
                </div>
              </div>
            )}
            
            {connectionStatus !== 'connected' && (
              <ConnectButton>Kết nối ví</ConnectButton>
            )}
          </div>

          {/* NFT Selection */}
          {connectionStatus !== 'connected' && (
            <Card className="mb-6">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-600 mb-4">
                  ⚠️ Vui lòng kết nối ví Sui để xem danh sách NFT của bạn
                </p>
                <ConnectButton>Kết nối ví ngay</ConnectButton>
              </CardContent>
            </Card>
          )}

          {connectionStatus === 'connected' && (
            <>
          {ownedNFTs.length === 0 && !loading && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    Bạn chưa có NFT nào trong ví
                  </p>
                  <Button
                    onClick={() => window.location.href = '/farmer/add-product'}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    Mint NFT ngay
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                  <p className="text-gray-600">Đang tải danh sách NFT của bạn...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {ownedNFTs.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Chọn NFT để cập nhật</CardTitle>
                <CardDescription>
                  Tìm thấy {ownedNFTs.length} NFT trong ví của bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ownedNFTs.map((nft) => (
                    <div
                      key={nft.id}
                      onClick={() => selectNFT(nft.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-lg ${
                        selectedNftId === nft.id
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={nft.image_url}
                          alt={nft.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {nft.name}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">
                            {nft.origin}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Giá: {(nft.price / 1000000).toLocaleString()} VNĐ
                          </p>
                          <p className="text-xs text-gray-500">
                            Tuổi: {nft.age} năm
                          </p>
                          <p className="text-xs font-mono text-gray-400 mt-1">
                            Module: {nft.moduleName}
                          </p>
                        </div>
                      </div>
                      {selectedNftId === nft.id && (
                        <div className="mt-2 text-xs text-emerald-600 font-medium">
                          ✓ Đang chọn
                        </div>
                      )}
                      {nft.moduleName !== 'product_nft_v2' && (
                        <div className="mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                          ⚠️ Module cũ - Không hỗ trợ
                        </div>
                      )}
                      {currentAccount && nft.owner && nft.owner.toLowerCase() !== currentAccount.address.toLowerCase() && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                          🔒 Bạn không phải owner
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* NFT Info */}
          {nftData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Ownership Warning */}
              {currentAccount && nftData.owner && nftData.owner.toLowerCase() !== currentAccount.address.toLowerCase() && (
                <Card className="border-red-300 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="text-red-600 text-2xl">🔒</div>
                      <div>
                        <h3 className="font-semibold text-red-900 mb-2">
                          Bạn không phải chủ sở hữu NFT này
                        </h3>
                        <p className="text-sm text-red-800 mb-2">
                          Chỉ chủ sở hữu NFT mới có thể cập nhật thông tin.
                        </p>
                        <p className="text-sm text-red-800">
                          Owner: <code className="bg-red-100 px-2 py-1 rounded font-mono text-xs">{nftData.owner}</code>
                        </p>
                        <p className="text-sm text-red-800 mt-1">
                          Your address: <code className="bg-red-100 px-2 py-1 rounded font-mono text-xs">{currentAccount.address}</code>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Module Compatibility Warning */}
              {nftModule !== 'product_nft_v2' && (
                <Card className="border-amber-300 bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="text-amber-600 text-2xl">⚠️</div>
                      <div>
                        <h3 className="font-semibold text-amber-900 mb-2">
                          NFT từ module cũ không hỗ trợ cập nhật
                        </h3>
                        <p className="text-sm text-amber-800 mb-2">
                          NFT này được tạo từ module <code className="bg-amber-100 px-2 py-1 rounded">{nftModule}</code> không có chức năng cập nhật động.
                        </p>
                        <p className="text-sm text-amber-800">
                          Chỉ NFT từ module <code className="bg-amber-100 px-2 py-1 rounded">product_nft_v2</code> mới có thể cập nhật.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Current Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin hiện tại</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Tên sản phẩm</p>
                      <p className="font-semibold">{nftData.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Xuất xứ</p>
                      <p className="font-semibold">{nftData.origin}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Nông dân</p>
                      <p className="font-semibold">{nftData.farmer_name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Update Forms */}
              <Tabs defaultValue="iot" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="iot">IoT Data</TabsTrigger>
                  <TabsTrigger value="financial">Tài chính</TabsTrigger>
                  <TabsTrigger value="stock">Kho hàng</TabsTrigger>
                  <TabsTrigger value="info">Thông tin</TabsTrigger>
                </TabsList>

                {/* IoT Tab */}
                <TabsContent value="iot">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cập nhật dữ liệu IoT</CardTitle>
                      <CardDescription>Cập nhật dữ liệu từ cảm biến</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Trạng thái IoT</label>
                        <Select value={iotStatus} onValueChange={setIotStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Đang theo dõi">Đang theo dõi</SelectItem>
                            <SelectItem value="Ngưng theo dõi">Ngưng theo dõi</SelectItem>
                            <SelectItem value="Lỗi cảm biến">Lỗi cảm biến</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium">Chiều cao (cm)</label>
                          <Input
                            type="number"
                            value={iotHeight}
                            onChange={(e) => setIotHeight(parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Tăng trưởng (cm/tháng)</label>
                          <Input
                            type="number"
                            value={iotGrowthPerMonth}
                            onChange={(e) => setIotGrowthPerMonth(parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Độ ẩm (%)</label>
                          <Input
                            type="number"
                            value={iotHumidity}
                            onChange={(e) => setIotHumidity(parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Nhiệt độ (°C)</label>
                          <Input
                            type="number"
                            value={iotTemperature}
                            onChange={(e) => setIotTemperature(parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">pH</label>
                          <Input
                            type="number"
                            step="0.1"
                            value={iotPh}
                            onChange={(e) => setIotPh(parseFloat(e.target.value))}
                          />
                        </div>
                      </div>

                      <Button
                        onClick={updateIotData}
                        disabled={updating || nftModule !== 'product_nft_v2' || (!!currentAccount && !!nftData.owner && nftData.owner.toLowerCase() !== currentAccount.address.toLowerCase())}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang cập nhật...
                          </>
                        ) : (currentAccount && nftData.owner && nftData.owner.toLowerCase() !== currentAccount.address.toLowerCase()) ? (
                          <>🔒 Không có quyền</>
                        ) : nftModule !== 'product_nft_v2' ? (
                          <>⚠️ Module không hỗ trợ</>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Cập nhật IoT Data
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Financial Tab */}
                <TabsContent value="financial">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cập nhật thông tin tài chính</CardTitle>
                      <CardDescription>ROI, giá và tăng trưởng</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium">ROI (%)</label>
                          <Input
                            type="number"
                            value={roi}
                            onChange={(e) => setRoi(parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Tăng trưởng (%/năm)</label>
                          <Input
                            type="number"
                            value={growthRate}
                            onChange={(e) => setGrowthRate(parseInt(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Giá (VNĐ)</label>
                          <Input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(parseFloat(e.target.value))}
                          />
                        </div>
                      </div>

                      <Button
                        onClick={updateFinancialData}
                        disabled={updating || nftModule !== 'product_nft_v2' || (!!currentAccount && !!nftData.owner && nftData.owner.toLowerCase() !== currentAccount.address.toLowerCase())}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang cập nhật...
                          </>
                        ) : (currentAccount && nftData.owner && nftData.owner.toLowerCase() !== currentAccount.address.toLowerCase()) ? (
                          <>🔒 Không có quyền</>
                        ) : nftModule !== 'product_nft_v2' ? (
                          <>⚠️ Module không hỗ trợ</>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Cập nhật Tài chính
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Info Tab */}
                <TabsContent value="info">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cập nhật mô tả</CardTitle>
                      <CardDescription>Chỉnh sửa mô tả sản phẩm</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        rows={6}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Nhập mô tả sản phẩm..."
                      />

                      <Button
                        onClick={updateDescription}
                        disabled={updating || nftModule !== 'product_nft_v2' || (!!currentAccount && !!nftData.owner && nftData.owner.toLowerCase() !== currentAccount.address.toLowerCase())}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang cập nhật...
                          </>
                        ) : (currentAccount && nftData.owner && nftData.owner.toLowerCase() !== currentAccount.address.toLowerCase()) ? (
                          <>🔒 Không có quyền</>
                        ) : nftModule !== 'product_nft_v2' ? (
                          <>⚠️ Module không hỗ trợ</>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Cập nhật Mô tả
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

            </motion.div>
          )}
          </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default UpdateNFT;
