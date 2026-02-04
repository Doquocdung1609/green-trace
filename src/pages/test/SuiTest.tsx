import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { SuiWalletButton } from '../../components/SuiWalletButton';

// Package ID sau khi publish Move contract
const PACKAGE_ID = '0x18c4900231904503471f9a056057d9f8369924d4174cf62986368ac8f7e1e0e1';

export default function SuiTest() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const mintNFT = async () => {
    if (!currentAccount) {
      alert('Please connect wallet first!');
      return;
    }

    setLoading(true);
    setResult('');

    try {
      const txb = new Transaction();
      
      // Call Move function mint_product_nft
      txb.moveCall({
        target: `${PACKAGE_ID}::product_nft::mint_product_nft`,
        arguments: [
          txb.pure(new TextEncoder().encode('Sâm Ngọc Linh Test')),
          txb.pure(new TextEncoder().encode('Sâm 6 năm tuổi - Test POC')),
          txb.pure(new TextEncoder().encode('https://example.com/sam-ngoc-linh.jpg')),
          txb.pure(new TextEncoder().encode('Kon Tum')),
          txb.pure(new TextEncoder().encode('Nguyễn Văn A')),
          txb.pure(new TextEncoder().encode('2019-10-01')),
          txb.pure.u64(BigInt(6)),
          txb.pure(new TextEncoder().encode('sui-tx-test-001')),
          txb.pure.address(currentAccount!.address),
        ],
      });

      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: txb as any,
          },
          {
            onSuccess: (response) => {
              console.log('✅ Minted NFT:', response);
              setResult(`Success! Digest: ${response.digest}`);
              resolve(response);
            },
            onError: (error) => {
              console.error('❌ Error minting NFT:', error);
              setResult(`Error: ${error.message || 'Unknown error'}`);
              reject(error);
            },
          }
        );
      });
      
    } catch (error: any) {
      console.error('❌ Error minting NFT:', error);
      setResult(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🌱 Sui NFT Minting Test
        </h1>
        <p className="text-gray-600 mb-6">
          Test POC - Mint NFT cho sản phẩm nông nghiệp trên Sui blockchain
        </p>
        
        <div className="mb-6">
          <SuiWalletButton />
        </div>

        {currentAccount && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h2 className="font-semibold text-blue-900 mb-2">📦 Package Info</h2>
              <p className="text-sm text-blue-700 font-mono break-all">
                {PACKAGE_ID}
              </p>
            </div>

            <button 
              onClick={mintNFT}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 px-6 py-3 rounded-lg text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Minting...
                </>
              ) : (
                <>
                  🎨 Mint Test NFT
                </>
              )}
            </button>

            {result && (
              <div className={`p-4 rounded-lg ${result.includes('Error') ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <h3 className={`font-semibold mb-2 ${result.includes('Error') ? 'text-red-900' : 'text-green-900'}`}>
                  {result.includes('Error') ? '❌ Error' : '✅ Success'}
                </h3>
                <p className={`text-sm font-mono break-all ${result.includes('Error') ? 'text-red-700' : 'text-green-700'}`}>
                  {result}
                </p>
                {!result.includes('Error') && (
                  <a 
                    href={`https://suiscan.xyz/devnet/tx/${result.split(': ')[1]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                  >
                    View on Suiscan →
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-3">📋 Next Steps:</h3>
          <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
            <li>Build contract: <code className="bg-gray-100 px-2 py-1 rounded">sui move build</code></li>
            <li>Publish: <code className="bg-gray-100 px-2 py-1 rounded">sui client publish --gas-budget 100000000</code></li>
            <li>Copy Package ID và update PACKAGE_ID ở file này</li>
            <li>Install packages: <code className="bg-gray-100 px-2 py-1 rounded">npm install @mysten/sui @mysten/dapp-kit</code></li>
            <li>Test mint NFT!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
