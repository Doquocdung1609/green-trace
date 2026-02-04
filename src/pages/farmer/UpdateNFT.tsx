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

const PACKAGE_ID = '0x3f95f8bd910fa2ad84f207031a0037cb2d45ebcd37b76d6f46ddc98bb7b2f0bb';
// Old package IDs for backward compatibility
const OLD_PACKAGE_IDS = [
  '0x8a695bb68afa0818ae84745e37be08efd3afa8bc8afa8173760be2d11fb5f2ab',
  '0x8f8459de97c57ffef07e8b3bb71dfe28b4e8358025979e629f2eeec5c9b19e50',
  '0x482396463dd8ae76e6fa9abebeb2242653b3be2e41234e0ac085d4e7ae898290', // First package
];
const SUI_CLIENT = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });

interface NFTData {
  id: string;
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
      });

      console.log('Total objects found:', objects.data.length);
      console.log('Raw objects data:', objects.data);
      
      // Filter ProductNFT objects
      const nfts: NFTData[] = [];
      
      for (const obj of objects.data) {
        const objType = obj.data?.type;
        console.log('Object type:', objType);
        
        // Check if this is a ProductNFT from any package version
        const isProductNFT = objType && (
          objType.includes(`${PACKAGE_ID}::product_nft_v2::ProductNFT`) ||
          objType.includes(`${PACKAGE_ID}::product_nft::ProductNFT`) ||
          OLD_PACKAGE_IDS.some(oldId => 
            objType.includes(`${oldId}::product_nft_v2::ProductNFT`) ||
            objType.includes(`${oldId}::product_nft::ProductNFT`)
          )
        );
        
        if (isProductNFT && obj.data?.content) {
          try {
            const content = obj.data.content as any;
            const fields = content.fields;

            nfts.push({
              id: obj.data.objectId,
              name: fields.name,
              description: fields.description,
              image_url: fields.image_url,
              origin: fields.origin,
              farmer_name: fields.farmer_name,
              production_date: fields.production_date,
              age: parseInt(fields.age),
              price: parseInt(fields.price),
              quantity: parseInt(fields.quantity),
              roi: parseInt(fields.roi),
              growth_rate: parseInt(fields.growth_rate),
              iot_status: fields.iot_status,
              iot_height: parseInt(fields.iot_height),
              iot_growth_per_month: parseInt(fields.iot_growth_per_month),
              iot_humidity: parseInt(fields.iot_humidity),
              iot_temperature: parseInt(fields.iot_temperature),
              iot_ph: parseInt(fields.iot_ph),
              iot_last_updated: fields.iot_last_updated,
              certifications_uri: fields.certifications_uri,
              timeline_uri: fields.timeline_uri,
            });
            
            console.log('Found ProductNFT:', fields.name);
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
      description: nft.name,
    });
  };

  const fetchNFT = async () => {
    // Refresh selected NFT data after update
    if (!selectedNftId || !currentAccount?.address) return;

    try {
      const object = await SUI_CLIENT.getObject({
        id: selectedNftId,
      });

      if (!object.data) return;

      const content = object.data.content as any;
      const fields = content.fields;

      const data: NFTData = {
        id: selectedNftId,
        name: fields.name,
        description: fields.description,
        image_url: fields.image_url,
        origin: fields.origin,
        farmer_name: fields.farmer_name,
        production_date: fields.production_date,
        age: parseInt(fields.age),
        price: parseInt(fields.price),
        quantity: parseInt(fields.quantity),
        roi: parseInt(fields.roi),
        growth_rate: parseInt(fields.growth_rate),
        iot_status: fields.iot_status,
        iot_height: parseInt(fields.iot_height),
        iot_growth_per_month: parseInt(fields.iot_growth_per_month),
        iot_humidity: parseInt(fields.iot_humidity),
        iot_temperature: parseInt(fields.iot_temperature),
        iot_ph: parseInt(fields.iot_ph),
        iot_last_updated: fields.iot_last_updated,
        certifications_uri: fields.certifications_uri,
        timeline_uri: fields.timeline_uri,
      };

      setNftData(data);
      
      // Update form values
      setIotStatus(data.iot_status);
      setIotHeight(data.iot_height);
      setIotGrowthPerMonth(data.iot_growth_per_month);
      setIotHumidity(data.iot_humidity);
      setIotTemperature(data.iot_temperature);
      setIotPh(data.iot_ph / 100);
      setRoi(data.roi);
      setGrowthRate(data.growth_rate);
      setPrice(data.price / 1000000);
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

  const stringToUint8Array = (str: string) => {
    return Array.from(new TextEncoder().encode(str));
  };

  const updateIotData = async () => {
    if (connectionStatus !== 'connected' || !nftData) return;

    setUpdating(true);
    try {
      const txb = new Transaction();

      txb.moveCall({
        target: `${PACKAGE_ID}::product_nft_v2::update_iot_data`,
        arguments: [
          txb.object(nftData.id),
          txb.pure(new Uint8Array(stringToUint8Array(iotStatus))),
          txb.pure.u64(BigInt(iotHeight)),
          txb.pure.u64(BigInt(iotGrowthPerMonth)),
          txb.pure.u64(BigInt(iotHumidity)),
          txb.pure.u64(BigInt(iotTemperature)),
          txb.pure.u64(BigInt(Math.floor(iotPh * 100))), // Convert to integer
          txb.pure(new Uint8Array(stringToUint8Array(new Date().toISOString()))),
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
    if (connectionStatus !== 'connected' || !nftData) return;

    setUpdating(true);
    try {
      const txb = new Transaction();

      txb.moveCall({
        target: `${PACKAGE_ID}::product_nft_v2::update_financial_data`,
        arguments: [
          txb.object(nftData.id),
          txb.pure.u64(BigInt(roi)),
          txb.pure.u64(BigInt(growthRate)),
          txb.pure.u64(BigInt(Math.floor(price * 1000000))), // Convert to micro units
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
    if (connectionStatus !== 'connected' || !nftData) return;

    setUpdating(true);
    try {
      const txb = new Transaction();

      txb.moveCall({
        target: `${PACKAGE_ID}::product_nft_v2::update_description`,
        arguments: [
          txb.object(nftData.id),
          txb.pure(new Uint8Array(stringToUint8Array(description))),
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
                        </div>
                      </div>
                      {selectedNftId === nft.id && (
                        <div className="mt-2 text-xs text-emerald-600 font-medium">
                          ✓ Đang chọn
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
                        disabled={updating}
                        className="w-full bg-emerald-500 hover:bg-emerald-600"
                      >
                        {updating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang cập nhật...
                          </>
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
                        disabled={updating}
                        className="w-full bg-emerald-500 hover:bg-emerald-600"
                      >
                        {updating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang cập nhật...
                          </>
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
                        disabled={updating}
                        className="w-full bg-emerald-500 hover:bg-emerald-600"
                      >
                        {updating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang cập nhật...
                          </>
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

              {/* View on Explorer */}
              <Card>
                <CardContent className="pt-6">
                  <a
                    href={`https://suiscan.xyz/devnet/object/${nftData.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline flex items-center gap-2"
                  >
                    🔍 Xem NFT trên Suiscan Explorer
                  </a>
                </CardContent>
              </Card>
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
