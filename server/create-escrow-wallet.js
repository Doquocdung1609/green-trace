// Script to create marketplace escrow wallet  
// Run: node create-escrow-wallet.js

const { Ed25519Keypair } = require('@mysten/sui.js/keypairs/ed25519');
const fs = require('fs');

// Generate new keypair
const keypair = Ed25519Keypair.generate();

// Get address
const address = keypair.getPublicKey().toSuiAddress();

// Get keypair in a format we can reconstruct
const exported = keypair.export();

const walletInfo = {
  address: address,
  keypair: exported, // Complete exported keypair object
  createdAt: new Date().toISOString(),
  purpose: 'Marketplace Escrow Wallet',
  network: 'testnet'
};

// Save to file
fs.writeFileSync(
  'marketplace-escrow-wallet.json',
  JSON.stringify(walletInfo, null, 2)
);

console.log('\n🎉 Marketplace Escrow Wallet Created!\n');
console.log('Address:', address);
console.log('\n⚠️  IMPORTANT: Keep marketplace-escrow-wallet.json SECRET!');
console.log('📝 Copy this address and update MARKETPLACE_ESCROW_WALLET in:');
console.log('   - src/pages/farmer/Products.tsx');
console.log('   - src/pages/customer/NFTMarketplace.tsx');
console.log('\n💰 Fund this wallet with testnet SUI from https://faucet.sui.io/');
