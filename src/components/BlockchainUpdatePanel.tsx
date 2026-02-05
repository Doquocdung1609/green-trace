import { useState } from 'react';
import { useCurrentAccount, useCurrentWallet, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { motion } from 'framer-motion';
import { Shield, RefreshCw, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from '../hooks/use-toast';

const PACKAGE_ID = '0xe2a9aed8775cb527b8f6bb55d9a5f6eb216865f5654f1a2ee1d2bd36e120d0b4';

interface BlockchainUpdatePanelProps {
  nftId: string;
  description: string;
  price: number; // in VND
  roi: number;
  growthRate: number;
  iotStatus: string;
  iotHeight: number;
  iotHumidity: number;
  iotTemperature: number;
  imageUrl?: string;
}

export function BlockchainUpdatePanel({
  nftId,
  description,
  price,
  roi,
  growthRate,
  iotStatus,
  iotHeight,
  iotHumidity,
  iotTemperature,
  imageUrl,
}: BlockchainUpdatePanelProps) {
  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const updateCompleteProductInfo = async () => {
    if (connectionStatus !== 'connected' || !currentAccount) {
      toast({
        title: 'Chưa kết nối ví',
        description: 'Vui lòng kết nối ví Sui để cập nhật blockchain',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);
    try {
      const txb = new Transaction();

      // Convert price from VND to micro SUI (assuming 1 SUI = 1,000,000 micro SUI)
      // Note: This is a simplified conversion, you may need to adjust based on actual exchange rate
      const basePriceInMicroSui = Math.floor(price);

      txb.moveCall({
        target: `${PACKAGE_ID}::advanced_product_nft::update_product_info`,
        arguments: [
          txb.object(nftId),
          txb.pure(new TextEncoder().encode(description)),
          txb.pure(new TextEncoder().encode(imageUrl || '')),
          txb.pure.u64(basePriceInMicroSui),
          txb.pure.u64(roi),
          txb.pure.u64(growthRate),
          txb.pure(new TextEncoder().encode(iotStatus)),
          txb.pure.u64(iotHeight),
          txb.pure.u64(iotHumidity),
          txb.pure.u64(iotTemperature),
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
                title: '✅ Cập nhật blockchain thành công!',
                description: `Transaction: ${result.digest}`,
              });
              setLastUpdated(new Date().toISOString());
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
        title: 'Lỗi cập nhật blockchain',
        description: error.message || 'Không thể cập nhật blockchain',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateDescriptionOnly = async () => {
    if (connectionStatus !== 'connected' || !currentAccount) {
      toast({
        title: 'Chưa kết nối ví',
        description: 'Vui lòng kết nối ví Sui để cập nhật blockchain',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);
    try {
      const txb = new Transaction();

      txb.moveCall({
        target: `${PACKAGE_ID}::advanced_product_nft::update_description`,
        arguments: [txb.object(nftId), txb.pure(new TextEncoder().encode(description))],
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
              setLastUpdated(new Date().toISOString());
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

  const updateEconomicParams = async () => {
    if (connectionStatus !== 'connected' || !currentAccount) {
      toast({
        title: 'Chưa kết nối ví',
        description: 'Vui lòng kết nối ví Sui để cập nhật blockchain',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);
    try {
      const txb = new Transaction();
      const basePriceInMicroSui = Math.floor(price);

      txb.moveCall({
        target: `${PACKAGE_ID}::advanced_product_nft::update_economic_params`,
        arguments: [
          txb.object(nftId),
          txb.pure.u64(basePriceInMicroSui),
          txb.pure.u64(roi),
          txb.pure.u64(growthRate),
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
                title: '✅ Cập nhật thông số kinh tế thành công!',
                description: `Transaction: ${result.digest}`,
              });
              setLastUpdated(new Date().toISOString());
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

  const updateIotData = async () => {
    if (connectionStatus !== 'connected' || !currentAccount) {
      toast({
        title: 'Chưa kết nối ví',
        description: 'Vui lòng kết nối ví Sui để cập nhật blockchain',
        variant: 'destructive',
      });
      return;
    }

    setUpdating(true);
    try {
      const txb = new Transaction();

      txb.moveCall({
        target: `${PACKAGE_ID}::advanced_product_nft::update_iot_data`,
        arguments: [
          txb.object(nftId),
          txb.pure(new TextEncoder().encode(iotStatus)),
          txb.pure.u64(iotHeight),
          txb.pure.u64(iotHumidity),
          txb.pure.u64(iotTemperature),
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
                title: '✅ Cập nhật dữ liệu IoT thành công!',
                description: `Transaction: ${result.digest}`,
              });
              setLastUpdated(new Date().toISOString());
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

  if (connectionStatus !== 'connected') {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Shield className="w-5 h-5" />
            Dynamic NFT - Cập nhật Blockchain
          </CardTitle>
          <CardDescription>
            NFT ID: <code className="text-xs bg-gray-100 px-2 py-1 rounded">{nftId}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-amber-700 py-8">
            <p className="mb-4">⚠️ Vui lòng kết nối ví Sui để cập nhật NFT trên blockchain</p>
            <p className="text-sm text-gray-600">
              Kết nối ví ở góc trên bên phải để sử dụng tính năng này
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-800">
            <Shield className="w-5 h-5" />
            Dynamic NFT - Cập nhật Blockchain
          </CardTitle>
          <CardDescription>
            NFT ID: <code className="text-xs bg-gray-100 px-2 py-1 rounded">{nftId}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastUpdated && (
            <div className="flex items-center gap-2 bg-green-100 text-green-800 p-3 rounded-lg">
              <Check className="w-5 h-5" />
              <span className="text-sm">
                Cập nhật lần cuối: {new Date(lastUpdated).toLocaleString('vi-VN')}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              type="button"
              onClick={updateCompleteProductInfo}
              disabled={updating}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {updating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Cập nhật toàn bộ lên Blockchain
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={updateDescriptionOnly}
              disabled={updating}
              variant="outline"
              className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
            >
              {updating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                'Chỉ cập nhật Mô tả'
              )}
            </Button>

            <Button
              type="button"
              onClick={updateEconomicParams}
              disabled={updating}
              variant="outline"
              className="border-blue-500 text-blue-700 hover:bg-blue-50"
            >
              {updating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                'Cập nhật Thông số Kinh tế'
              )}
            </Button>

            <Button
              type="button"
              onClick={updateIotData}
              disabled={updating}
              variant="outline"
              className="border-purple-500 text-purple-700 hover:bg-purple-50"
            >
              {updating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                'Cập nhật Dữ liệu IoT'
              )}
            </Button>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Hướng dẫn:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>
                <strong>Cập nhật toàn bộ:</strong> Cập nhật mô tả, giá, ROI, growth rate, và dữ
                liệu IoT
              </li>
              <li>
                <strong>Chỉ cập nhật Mô tả:</strong> Chỉ thay đổi phần mô tả sản phẩm
              </li>
              <li>
                <strong>Thông số Kinh tế:</strong> Cập nhật giá, ROI, và tỷ lệ tăng trưởng
              </li>
              <li>
                <strong>Dữ liệu IoT:</strong> Cập nhật trạng thái và các chỉ số từ cảm biến
              </li>
            </ul>
          </div>

          <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded border">
            <p className="font-semibold mb-1">Lưu ý quan trọng:</p>
            <p>
              • Mỗi lần cập nhật blockchain sẽ tốn phí gas (SUI) <br />
              • Chỉ farmer (người tạo NFT) mới có quyền cập nhật <br />
              • Các thay đổi sẽ được ghi lại vĩnh viễn trên blockchain <br />• NFT của bạn sẽ tự
              động cập nhật metadata sau khi transaction hoàn thành
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
