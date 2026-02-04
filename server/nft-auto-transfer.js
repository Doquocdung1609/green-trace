// Auto-transfer NFT from escrow wallet to buyer after purchase
// Run: node nft-auto-transfer.js

const { SuiClient } = require('@mysten/sui.js/client');
const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const { TransactionBlock } = require('@mysten/sui.js/transactions');
const fs = require('fs');

const SUI_CLIENT = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });

// Load escrow wallet
const walletInfo = JSON.parse(fs.readFileSync('marketplace-escrow-wallet.json', 'utf8'));
const privateKeyBytes = Buffer.from(walletInfo.privateKey, 'base64');
const keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);

console.log('🤖 NFT Auto-Transfer Service Started');
console.log('📍 Escrow Wallet:', walletInfo.address);
console.log('⏰ Monitoring purchases...\n');

// Mock purchases array (in production, fetch from API)
let processedPurchases = new Set();

async function checkAndTransferNFTs() {
  try {
    // Fetch pending purchases from API
    const response = await fetch('http://localhost:3000/api/nft-purchases');
    const purchases = await response.json();
    
    for (const purchase of purchases) {
      if (purchase.status === 'pending_nft_transfer' && !processedPurchases.has(purchase.id)) {
        console.log(`\n🔄 Processing purchase: ${purchase.id}`);
        console.log(`   Buyer: ${purchase.buyerAddress}`);
        console.log(`   Listing: ${purchase.listingId}`);
        
        // Find the NFT listing details
        const listingResponse = await fetch('http://localhost:3000/api/nft-listings');
        const listings = await listingResponse.json();
        const listing = listings.find(l => l.id === purchase.listingId);
        
        if (!listing) {
          console.log(`   ⚠️  Listing not found, skipping...`);
          continue;
        }
        
        try {
          // Create transaction to transfer NFT
          const tx = new TransactionBlock();
          tx.transferObjects(
            [tx.object(listing.nftId)],
            tx.pure(purchase.buyerAddress, 'address')
          );
          
          // Sign and execute with escrow wallet
          tx.setSender(walletInfo.address);
          tx.setGasBudget(10000000);
          
          const result = await SUI_CLIENT.signAndExecuteTransactionBlock({
            transactionBlock: tx,
            signer: keypair,
            options: { showEffects: true }
          });
          
          if (result.digest) {
            console.log(`   ✅ NFT transferred successfully!`);
            console.log(`   📝 Transaction: ${result.digest}`);
            console.log(`   🎁 NFT ID: ${listing.nftId}`);
            
            // Mark purchase as completed (in production, update via API)
            processedPurchases.add(purchase.id);
            
            // TODO: Update purchase status in backend
            // await fetch(`http://localhost:3000/api/nft-purchases/${purchase.id}`, {
            //   method: 'PATCH',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({ 
            //     status: 'completed',
            //     transferTxDigest: result.digest 
            //   })
            // });
          }
        } catch (error) {
          console.error(`   ❌ Error transferring NFT:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('Error checking purchases:', error.message);
  }
}

// Check every 10 seconds
setInterval(checkAndTransferNFTs, 10000);

// Initial check
checkAndTransferNFTs();

console.log('✅ Service running. Press Ctrl+C to stop.\n');
