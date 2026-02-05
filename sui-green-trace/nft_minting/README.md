# Sui Green Trace - NFT Minting Contract

Move smart contract để mint NFT cho sản phẩm nông nghiệp trên Sui blockchain.

## 📦 Structure

```
nft_minting/
├── Move.toml              # Package config
└── sources/
    └── product_nft.move   # Main NFT contract
```

## 🚀 Build & Deploy

### 1. Build contract
```bash
cd sui-green-trace/nft_minting
sui move build
```

### 2. Test (optional)
```bash
sui move test
```

### 3. Publish to devnet
```bash
sui client publish --gas-budget 100000000
```

**Sau khi publish, bạn sẽ nhận được:**
- ✅ Package ID (cần copy vào frontend)
- ✅ Transaction digest
- ✅ Object changes

**Lưu Package ID để dùng trong frontend!**

## 📝 Contract Functions

### `mint_product_nft`
Mint NFT mới cho sản phẩm.

**Parameters:**
- `name`: Tên sản phẩm
- `description`: Mô tả
- `image_url`: URL hình ảnh (IPFS)
- `origin`: Nguồn gốc
- `farmer_name`: Tên nông dân
- `production_date`: Ngày gieo trồng
- `age`: Tuổi (số năm)
- `blockchain_tx_id`: Transaction ID reference
- `recipient`: Địa chỉ người nhận NFT

### `burn`
Xóa NFT (chỉ owner mới gọi được).

### Getter functions
- `get_name()`
- `get_origin()`
- `get_age()`
- `get_image_url()`
- `get_farmer_name()`

## 🔗 Explorer Links

- **Devnet Explorer**: https://suiscan.xyz/devnet
- **Testnet Explorer**: https://suiscan.xyz/testnet
- **Mainnet Explorer**: https://suiscan.xyz/mainnet

## 📚 Resources

- Sui Docs: https://docs.sui.io
- Move Book: https://move-book.com
- Sui Examples: https://examples.sui.io
