// Check escrow wallet balance
const { SuiClient } = require('@mysten/sui.js/client');
const fs = require('fs');
const path = require('path');

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });

async function checkBalance() {
  try {
    const walletPath = path.join(__dirname, 'marketplace-escrow-wallet.json');
    const walletInfo = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
    
    console.log('\n📍 Escrow Wallet Address:', walletInfo.address);
    console.log('🔗 View on Suiscan:', `https://suiscan.xyz/testnet/account/${walletInfo.address}\n`);
    
    const balance = await client.getBalance({
      owner: walletInfo.address,
    });
    
    const suiAmount = parseInt(balance.totalBalance) / 1_000_000_000;
    console.log('💰 Balance:', suiAmount, 'SUI');
    console.log('   Raw:', balance.totalBalance, 'MIST\n');
    
    if (suiAmount < 0.1) {
      console.log('⚠️  WARNING: Low balance! Need at least 0.1 SUI for gas fees.');
      console.log('💰 Fund this wallet at: https://faucet.sui.io/\n');
    } else {
      console.log('✅ Sufficient balance for transactions\n');
    }
    
    // Check for owned NFTs
    const objects = await client.getOwnedObjects({
      owner: walletInfo.address,
      options: { showType: true, showContent: true }
    });
    
    console.log('📦 Owned Objects:', objects.data.length);
    if (objects.data.length > 0) {
      console.log('\nNFTs in escrow wallet:');
      objects.data.forEach((obj, i) => {
        console.log(`${i + 1}. ${obj.data?.objectId} - Type: ${obj.data?.type}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkBalance();
