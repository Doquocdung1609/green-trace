import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from '../../hooks/use-toast';
import { Clock, Lock, Package } from 'lucide-react';

const PACKAGE_ID = '0x18c4900231904503471f9a056057d9f8369924d4174cf62986368ac8f7e1e0e1'; // Updated after deployment
const REGISTRY_ID = '0xc2ebceb5f68416005a128ac55e4a60a0b62a9cf287639ea8f135ff186c439ea0';
const ESCROW_VAULT_ID = '0x5f5cbe8b2588089ce1acbecbe84c9ba01ad1527196c660c3259b87ae3ef1f805';

interface NFTWithMaintenance {
  id: string;
  name: string;
  image_url: string;
  evolution_stage: number;
  monthly_maintenance_fee: number;
  last_maintenance_paid: number;
  maintenance_due_date: number;
  total_maintenance_paid: number;
  status: number;
  transfer_type: number;
}

const EVOLUTION_STAGES = ['🌱 Seedling', '🌿 Growing', '🌳 Mature', '🍎 Harvest Ready'];
const STATUS_NAMES = ['Active', 'In Escrow', 'Shipped', 'Redeemed', 'Burned'];

export default function MaintenanceDashboard() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [nfts] = useState<NFTWithMaintenance[]>([]);
  const [paying, setPaying] = useState<string | null>(null);

  const payMaintenance = async (nft: NFTWithMaintenance) => {
    if (!currentAccount?.address) {
      toast({
        title: "Chưa kết nối ví",
        description: "Vui lòng kết nối ví Sui",
        variant: "destructive"
      });
      return;
    }

    setPaying(nft.id);
    try {
      const tx = new Transaction();
      
      // Split coin for maintenance payment
      const [coin] = tx.splitCoins(tx.gas, [nft.monthly_maintenance_fee]);

      // Pay maintenance
      tx.moveCall({
        target: `${PACKAGE_ID}::advanced_product_nft::pay_maintenance`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.object(nft.id),
          coin,
          tx.object('0x6'), // Clock object
        ],
      });

      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: tx as any },
          {
            onSuccess: (result) => {
              toast({
                title: "✅ Đã thanh toán maintenance!",
                description: `Transaction: ${result.digest}`,
              });
              resolve(result);
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    } catch (error: any) {
      console.error('Error paying maintenance:', error);
      toast({
        title: "Lỗi thanh toán",
        description: error.message || "Đã xảy ra lỗi",
        variant: "destructive"
      });
    } finally {
      setPaying(null);
    }
  };

  const lockInEscrow = async (nft: NFTWithMaintenance) => {
    if (!currentAccount?.address) return;

    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${PACKAGE_ID}::advanced_product_nft::lock_in_escrow`,
        arguments: [
          tx.object(ESCROW_VAULT_ID),
          tx.object(nft.id),
        ],
      });

      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          { transaction: tx as any },
          {
            onSuccess: (result) => {
              toast({
                title: "🔒 NFT đã lock vào escrow!",
                description: "Chờ admin confirm để redeem sản phẩm vật lý",
              });
              resolve(result);
            },
            onError: (error) => {
              reject(error);
            },
          }
        );
      });
    } catch (error: any) {
      console.error('Error locking NFT:', error);
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getMaintenanceStatus = (nft: NFTWithMaintenance) => {
    const now = Date.now();
    const dueDate = nft.maintenance_due_date;
    
    if (now > dueDate) {
      return { text: 'Overdue', color: 'bg-red-500' };
    } else if (now > dueDate - 7 * 24 * 60 * 60 * 1000) {
      return { text: 'Due Soon', color: 'bg-yellow-500' };
    }
    return { text: 'Paid', color: 'bg-green-500' };
  };

  const calculateEvolutionProgress = (paid: number) => {
    // Evolution thresholds: 2, 5, 10 SUI
    const thresholds = [2000000000, 5000000000, 10000000000];
    let progress = 0;
    let nextThreshold = thresholds[0];

    for (const threshold of thresholds) {
      if (paid >= threshold) {
        progress = 100;
      } else {
        progress = (paid / threshold) * 100;
        nextThreshold = threshold;
        break;
      }
    }

    return { progress, nextThreshold };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-green-700 dark:text-green-400 mb-8">
          NFT Maintenance Dashboard
        </h1>

        {nfts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Bạn chưa có NFT nào cần maintenance
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nfts.map((nft) => {
              const maintenanceStatus = getMaintenanceStatus(nft);
              const { progress, nextThreshold } = calculateEvolutionProgress(nft.total_maintenance_paid);

              return (
                <Card key={nft.id} className="overflow-hidden">
                  <CardHeader className="relative p-0">
                    <img
                      src={nft.image_url}
                      alt={nft.name}
                      className="w-full h-48 object-cover"
                    />
                    <Badge className={`absolute top-3 right-3 ${maintenanceStatus.color}`}>
                      {maintenanceStatus.text}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-6">
                    <CardTitle className="text-xl mb-4">{nft.name}</CardTitle>

                    {/* Evolution Stage */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">Evolution:</span>
                        <span className="font-bold">{EVOLUTION_STAGES[nft.evolution_stage]}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {(nft.total_maintenance_paid / 1e9).toFixed(2)} / {(nextThreshold / 1e9).toFixed(0)} SUI
                      </p>
                    </div>

                    {/* Status */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <Badge variant="outline">{STATUS_NAMES[nft.status]}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Monthly Fee:</span>
                        <span className="font-medium">{(nft.monthly_maintenance_fee / 1e9).toFixed(2)} SUI</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      {nft.transfer_type === 1 && nft.status === 0 && (
                        <Button
                          onClick={() => payMaintenance(nft)}
                          disabled={paying === nft.id}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {paying === nft.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                              Đang xử lý...
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 mr-2" />
                              Pay Maintenance
                            </>
                          )}
                        </Button>
                      )}

                      {nft.evolution_stage === 3 && nft.status === 0 && (
                        <Button
                          onClick={() => lockInEscrow(nft)}
                          variant="outline"
                          className="w-full"
                        >
                          <Lock className="w-4 h-4 mr-2" />
                          Redeem Physical Product
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
