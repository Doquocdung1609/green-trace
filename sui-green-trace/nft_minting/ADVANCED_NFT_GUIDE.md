# Advanced Product NFT - Smart Contract Guide

## 🎯 Tính năng chính

### 1. **Publisher & Display**
- ✅ One-Time-Witness pattern để tạo Publisher
- ✅ Display object cho NFT metadata động

### 2. **Dual Transfer Modes**
- **Direct Transfer**: Chuyển NFT trực tiếp không cần maintenance
- **With Maintenance**: NFT yêu cầu trả phí maintenance hàng tháng

### 3. **Maintenance System**
- ✅ Recurring payment mechanism
- ✅ Monthly maintenance fee tracking
- ✅ Maintenance history on-chain
- ✅ Payment goes directly to farmer

### 4. **NFT Evolution**
- **Stage 0 - Seedling**: Mới mint
- **Stage 1 - Growing**: Paid ≥ 2 SUI maintenance
- **Stage 2 - Mature**: Paid ≥ 5 SUI maintenance  
- **Stage 3 - Harvest Ready**: Paid ≥ 10 SUI maintenance
- ✅ Metadata URI updates khi evolve

### 5. **Escrow & Redeem System**
- ✅ Lock NFT vào escrow vault thay vì burn ngay
- ✅ Admin confirm shipped rồi mới burn
- ✅ Emergency withdraw nếu cần

### 6. **Status Management**
```
STATUS_ACTIVE (0)       → Đang hoạt động bình thường
STATUS_IN_ESCROW (1)    → Đã lock để redeem
STATUS_SHIPPED (2)      → Admin đã confirm ship
STATUS_REDEEMED (3)     → Đã redeem thành công
STATUS_BURNED (4)       → Đã burn
```

### 7. **Resell Market**
- ✅ Transfer NFT tự do giữa users
- ✅ Sell function với payment verification
- ✅ Maintenance history theo NFT

## 📋 Deployment Instructions

### 1. Build contract
```bash
cd sui-green-trace/nft_minting
sui move build
```

### 2. Publish contract
```bash
sui client publish --gas-budget 100000000
```

### 3. Save important objects
Sau khi publish, save lại:
- **Package ID**: `0x...`
- **Publisher ID**: `0x...`
- **NFTRegistry ID**: `0x...` (shared object)
- **EscrowVault ID**: `0x...` (shared object)
- **AdminCap ID**: `0x...` (owned object)

## 🔧 Usage Examples

### Mint NFT with Maintenance
```typescript
const tx = new Transaction();

tx.moveCall({
  target: `${PACKAGE_ID}::advanced_product_nft::mint_product_nft`,
  arguments: [
    tx.object(REGISTRY_ID),
    tx.pure.string("Sâm Ngọc Linh 5 năm"),
    tx.pure.string("Sâm quý hiếm..."),
    tx.pure.string("https://ipfs.io/..."),
    tx.pure.string("Kon Tum"),
    tx.pure.string("Nguyễn Văn A"),
    tx.pure.string("2024-01-01"),
    tx.pure.u64(5), // age
    tx.pure.u64(5000000), // base_price
    tx.pure.u64(15), // roi
    tx.pure.u64(12), // growth_rate
    tx.pure.u64(100000000), // monthly_maintenance_fee (0.1 SUI)
    tx.pure.u8(1), // TRANSFER_TYPE_WITH_MAINTENANCE
    tx.pure.string("Active"),
    tx.pure.u64(150),
    tx.pure.u64(65),
    tx.pure.u64(25),
    tx.pure.string("ipfs://certifications"),
    tx.pure.string("ipfs://timeline"),
    tx.pure.string("ipfs://metadata"),
    tx.pure.address(recipientAddress),
    tx.object('0x6'), // Clock
  ],
});
```

### Pay Maintenance
```typescript
const tx = new Transaction();
const [coin] = tx.splitCoins(tx.gas, [100000000]); // 0.1 SUI

tx.moveCall({
  target: `${PACKAGE_ID}::advanced_product_nft::pay_maintenance`,
  arguments: [
    tx.object(REGISTRY_ID),
    tx.object(nftId),
    coin,
    tx.object('0x6'), // Clock
  ],
});
```

### Lock in Escrow
```typescript
const tx = new Transaction();

tx.moveCall({
  target: `${PACKAGE_ID}::advanced_product_nft::lock_in_escrow`,
  arguments: [
    tx.object(ESCROW_VAULT_ID),
    tx.object(nftId),
  ],
});
```

### Confirm Shipped & Burn (Admin)
```typescript
const tx = new Transaction();

tx.moveCall({
  target: `${PACKAGE_ID}::advanced_product_nft::confirm_shipped_and_burn`,
  arguments: [
    tx.object(ADMIN_CAP_ID),
    tx.object(ESCROW_VAULT_ID),
    tx.pure.address(nftId),
  ],
});
```

## 🎨 Frontend Integration

### 1. Check Maintenance Status
```typescript
const isOverdue = await suiClient.devInspectTransactionBlock({
  sender: address,
  transactionBlock: {
    kind: 'moveCall',
    target: `${PACKAGE_ID}::advanced_product_nft::is_maintenance_due`,
    arguments: [nftId, '0x6'],
  }
});
```

### 2. Get Evolution Stage
```typescript
const stage = nft.evolution_stage;
const stageNames = ['Seedling', 'Growing', 'Mature', 'Harvest Ready'];
```

### 3. View Maintenance History
Query NFTRegistry's maintenance_history table

## 📊 Economic Model

### Maintenance Fees
- Tháng 1-3: 0.1 SUI/tháng
- Tháng 4-6: 0.15 SUI/tháng  
- Tháng 7+: 0.2 SUI/tháng

### Evolution Rewards
- Stage 1 (Growing): +5% value
- Stage 2 (Mature): +15% value
- Stage 3 (Harvest): +30% value

## 🔐 Security Features

1. **Admin-only functions**: confirm_shipped, emergency_withdraw
2. **Payment verification**: All transactions verify exact payment amounts
3. **Status checks**: Prevent invalid state transitions
4. **Escrow safety**: NFT locked trước khi burn

## 🚀 Next Steps

1. Deploy contract to testnet
2. Update PACKAGE_ID in frontend
3. Create admin dashboard for escrow management
4. Add maintenance payment reminders
5. Build evolution progress UI
6. Implement resell marketplace
