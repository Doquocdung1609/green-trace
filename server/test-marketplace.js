// Test script for NFT Marketplace flow with escrow wallet
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

// The NFT currently in escrow wallet (from check-escrow-balance.js)
const TEST_NFT_ID = '0x2453183bf32e6f549f0ec3fb7ab3ab40153c8cdb1bdd9421aa8c7ee76325f8e3';
const BUYER_ADDRESS = '0x6a8188d4eb41c179f40f7d4760d84fda2365943104cf36ac27c949a8bc50fae6'; // Replace with real buyer
const SELLER_ADDRESS = '0xfa5963bc86baa314fba83d95f2e4604bbbc13ff1a8f9f6e00ca46a83f96b59f9'; // Escrow wallet
const FAKE_TX_DIGEST = 'TestTransaction' + Date.now();

async function testMarketplaceFlow() {
  console.log('\n🧪 Testing NFT Marketplace Flow\n');
  console.log('━'.repeat(50));
  
  try {
    // Step 1: Create a listing
    console.log('\n📝 Step 1: Creating NFT listing...');
    const listingResponse = await axios.post(`${API_BASE}/api/nft-listings`, {
      nftId: TEST_NFT_ID,
      sellerAddress: SELLER_ADDRESS,
      priceInSui: 0.5,
      priceInUsd: 1.25,
      productName: 'Test Product NFT',
      productImage: 'https://example.com/image.jpg'
    });
    
    const listing = listingResponse.data;
    console.log('✅ Listing created:', listing.id);
    console.log('   NFT ID:', listing.nftId);
    console.log('   Price:', listing.priceInSui, 'SUI');
    
    // Step 2: Get all listings
    console.log('\n📋 Step 2: Fetching all listings...');
    const listingsResponse = await axios.get(`${API_BASE}/api/nft-listings`);
    console.log(`✅ Found ${listingsResponse.data.length} listing(s)`);
    
    // Step 3: Record a purchase
    console.log('\n💰 Step 3: Recording purchase...');
    const purchaseResponse = await axios.post(`${API_BASE}/api/nft-purchases`, {
      listingId: listing.id,
      buyerAddress: BUYER_ADDRESS,
      txDigest: FAKE_TX_DIGEST,
      timestamp: new Date().toISOString()
    });
    
    const purchase = purchaseResponse.data;
    console.log('✅ Purchase recorded:', purchase.id);
    console.log('   Status:', purchase.status);
    console.log('   Buyer:', purchase.buyerAddress);
    
    // Step 4: Get all purchases
    console.log('\n📊 Step 4: Fetching all purchases...');
    const purchasesResponse = await axios.get(`${API_BASE}/api/nft-purchases`);
    console.log(`✅ Found ${purchasesResponse.data.length} purchase(s)`);
    purchasesResponse.data.forEach(p => {
      console.log(`   - ${p.id}: ${p.status}`);
    });
    
    // Step 5: Wait for auto-transfer
    console.log('\n⏳ Step 5: Waiting for auto-transfer (max 30 seconds)...');
    console.log('   Auto-transfer runs every 10 seconds');
    
    let transferred = false;
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const updatedPurchases = await axios.get(`${API_BASE}/api/nft-purchases`);
      const updatedPurchase = updatedPurchases.data.find(p => p.id === purchase.id);
      
      console.log(`   Check ${i + 1}/3: Status = ${updatedPurchase.status}`);
      
      if (updatedPurchase.status === 'completed') {
        transferred = true;
        console.log('   ✅ NFT transferred successfully!');
        console.log('   Transfer TX:', updatedPurchase.transferTxDigest);
        break;
      }
    }
    
    if (!transferred) {
      console.log('   ⚠️  Auto-transfer did not complete within 30 seconds');
      console.log('   Check server logs for errors');
    }
    
    // Step 6: Clean up - delete listing
    console.log('\n🧹 Step 6: Cleaning up listing...');
    await axios.delete(`${API_BASE}/api/nft-listings/${listing.id}`);
    console.log('✅ Listing deleted');
    
    console.log('\n━'.repeat(50));
    console.log('✅ Test completed!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${API_BASE}/api/nft-listings`);
    return true;
  } catch (error) {
    console.error('❌ Server is not running at', API_BASE);
    console.error('   Please start the server first: cd server && node server.js');
    return false;
  }
}

// Main
(async () => {
  console.log('🚀 NFT Marketplace Test Script\n');
  
  if (await checkServer()) {
    await testMarketplaceFlow();
  }
})();
