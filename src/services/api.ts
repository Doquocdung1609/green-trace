// api.ts (updated with mock data consolidated; no changes needed to data as it's already comprehensive)
export const fetchProducts = async () => {
  return [
    { id: '1', name: 'Cà phê Đắk Lắk', price: 200000, image: 'https://daklakmuseum.vn/baotangdaklak/imgs/166682075163094.jpeg', origin: 'Đắk Lắk' },
    { id: '2', name: 'Rau cải xanh', price: 30000, image: 'https://product.hstatic.net/1000354044/product/e67ea114189ed254f3c8534857bfea25_13e759bd88d348ec992725c28d788b08_master.jpg', origin: 'Đà Lạt' },
    { id: '3', name: 'Xoài Cát Hòa Lộc', price: 50000, image: 'https://cdn.tgdd.vn/Files/2017/12/03/1047079/nguon-goc-xoai-cat-hoa-loc-va-cach-chon-xoai-cat-hoa-loc-tuoi-ngon-202302251337264013.jpg', origin: 'Tiền Giang' },
    { id: '4', name: 'Rau má', price: 45000, image: 'https://file.dacsanxuthanh.vn/2023/05/30/s-20210602-144322-287677-rau-ma-max-1800x1800.jpg', origin: 'Thanh hóa' },
    { id: '5', name: 'Sầu riêng Ri6', price: 120000, image: 'https://product.hstatic.net/200000157781/product/sau_rieng_ri6_977b4b436948421fabd583bbd83f2fb8.png', origin: 'Đắk Nông' },
    { id: '6', name: 'Bắp cải tím', price: 25000, image: 'https://nongsandalat.vn/wp-content/uploads/2021/10/bap_cai_tim_da_lat-570x421-1.jpg', origin: 'Đà Lạt' },
    { id: '7', name: 'Chôm chôm', price: 35000, image: 'https://thuyanhfruits.com/wp-content/uploads/2021/02/unnamed.png', origin: 'Vĩnh Long' },
    { id: '8', name: 'Rau muống', price: 20000, image: 'https://suckhoedoisong.qltns.mediacdn.vn/324455921873985536/2023/9/6/14-cong-dung-tuyet-voi-cua-rau-muong-voi-suc-khoe-anh2-16940033928751881268635.jpg', origin: 'Đồng Nai' },
    { id: '9', name: 'Hạt điều Bình Phước', price: 180000, image: 'https://dacsandalat.com.vn/wp-content/uploads/2024/10/hat-dieu-rang-muoi-q_optimized.jpg', origin: 'Bình Phước' },
    { id: '10', name: 'Thanh long ruột đỏ', price: 40000, image: 'https://bizweb.dktcdn.net/100/390/808/products/thanh-long-600x600.jpg?v=1600505776873', origin: 'Bình Thuận' },
    { id: '11', name: 'Cà rốt Đà Lạt', price: 28000, image: 'https://foody24h.vn/uploads/services/ca-rot-da-lat-1924-2022-01-23.jpg', origin: 'Đà Lạt' },
    { id: '12', name: 'Dưa hấu ruột đỏ', price: 15000, image: 'https://lh5.googleusercontent.com/proxy/bwozxqzmZJSbJ0ir6CfLTZxVWAMAcapPlvOaAIMDjIt9vkI4Ym0WjEc1gQYmt2c8Xb4AY-gKJbDqQ-hSsuw9bhiLmaSUsTr1TMoADJiUCL9vKkySdp2qHhMUmeKV6bACPzrlbAKkXQ', origin: 'Hà Nội' },
  ];
};

// Mock fetchOrders
export const fetchOrders = async () => {
  return [
    {
      id: 'ORD001',
      customerName: 'Nguyen Van A',
      total: 500000,
      date: '2025-10-01',
      status: 'pending',
    },
    {
      id: 'ORD002',
      customerName: 'Tran Thi B',
      total: 250000,
      date: '2025-10-02',
      status: 'completed',
    },
    {
      id: 'ORD003',
      customerName: 'Le Van C',
      total: 300000,
      date: '2025-10-03',
      status: 'cancelled',
    },
  ];
};

// Nếu bạn vẫn muốn mintNFT trong React, hãy chuyển require sang import
import { Connection, Keypair, Transaction, SystemProgram } from '@solana/web3.js';

export const mintNFT = async (data: any, wallet: any) => {
  const connection = new Connection('https://api.devnet.solana.com');
  const fromWallet = Keypair.generate();
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromWallet.publicKey,
      toPubkey: fromWallet.publicKey,
      lamports: 1000000,
    })
  );
  return 'mock-transaction-id';
};