const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const pinataSDK = require('@pinata/sdk');


const app = express();
const port = 3000;

const pinata = new pinataSDK({
  pinataApiKey: '0df2b918f2c4f7beab1d',
  pinataSecretApiKey: '8d14f00c90a8860bff3bccfa63f5ced599538d6958ec44fc99e2e578869db8a7',
});

const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(bodyParser.json());


// In-memory store
let products = [
  {
    id: 'bio1',
    name: 'Sâm Ngọc Linh 6 năm tuổi',
    description: 'Sâm quý hiếm từ núi Ngọc Linh, theo dõi tăng trưởng bằng IoT cảm biến độ ẩm & nhiệt độ.',
    price: 5000000,
    image: 'https://suckhoedoisong.qltns.mediacdn.vn/Images/hahien/2016/12/29/hinh_anh_sam_ngoc_linh_viet_nam.jpg',
    origin: 'Kon Tum',
    farmerName: 'Nguyễn Văn A',
    productionDate: '2019-10-01',
    age: 6,
    growthRate: 15.2,
    iotStatus: 'Đang theo dõi',
    timeline: [
      {
        title: 'Gieo trồng',
        desc: 'Trồng cây con Sâm Ngọc Linh giống quý trên núi Ngọc Linh.',
        date: '2019-10-01',
        location: 'Núi Ngọc Linh, Kon Tum',
        responsible: ''
      },
      {
        title: 'Theo dõi IoT',
        desc: 'Cảm biến môi trường ghi nhận độ ẩm 65%, nhiệt độ trung bình 18°C.',
        date: '2023-05-15',
        location: 'Núi Ngọc Linh, Kon Tum',
        responsible: ''
      },
      {
        title: 'Đạt trưởng thành',
        desc: 'Củ sâm đạt trọng lượng trung bình 120g với dược tính cao.',
        date: '2025-01-20',
        location: 'Núi Ngọc Linh, Kon Tum',
        responsible: ''
      },
      {
        title: 'Định giá & Token hóa',
        desc: 'Tài sản được mint NFT đại diện trên Solana.',
        date: '2025-03-10',
        location: 'Blockchain',
        responsible: ''
      }
    ],
    certifications: [
      { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      { name: 'Organic', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
    ],
    blockchainTxId: 'tx-1234567890',
    roi: 0,
    priceHistory: mockPriceHistory(5000000),
    iotData: {
      height: 120,
      growthPerMonth: 5.2,
      humidity: 65,
      temperature: 18,
      pH: 6.5,
      lastUpdated: '2025-10-15T10:00:00Z'
    },
    owner: '9YRsWYqWvjnMK176Mm9S4G1MddgJHTEP2Xcmx4Umphqc',
  },
  {
    id: 'bio2',
    name: 'Nấm Linh Chi 1 năm tuổi',
    description: 'Nấm Linh Chi quý, hỗ trợ hệ miễn dịch, giám sát bằng cảm biến nhiệt độ và độ ẩm.',
    price: 2000000,
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/81/Ganoderma_lucidum_01.jpg',
    origin: 'Lâm Đồng',
    farmerName: 'Trần Thị B',
    productionDate: '2024-10-01',
    age: 1,
    growthRate: 12.5,
    iotStatus: 'Đang theo dõi',
    timeline: [
      {
        title: 'Gieo trồng',
        desc: 'Nuôi cấy nấm Linh Chi trong môi trường kiểm soát.',
        date: '2024-10-01',
        location: 'Nông trại Lâm Đồng',
        responsible: ''
      },
      {
        title: 'Theo dõi IoT',
        desc: 'Cảm biến ghi nhận độ ẩm 80%, nhiệt độ 22°C.',
        date: '2025-01-15',
        location: 'Nông trại Lâm Đồng',
        responsible: ''
      },
      {
        title: 'Đạt trưởng thành',
        desc: 'Nấm đạt độ trưởng thành tối ưu với dược tính cao.',
        date: '2025-09-01',
        location: 'Nông trại Lâm Đồng',
        responsible: ''
      },
      {
        title: 'Định giá & Token hóa',
        desc: 'NFT đại diện cho nấm Linh Chi được phát hành trên Solana.',
        date: '2025-10-10',
        location: 'Blockchain',
        responsible: ''
      }
    ],
    certifications: [
      { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
    ],
    blockchainTxId: 'tx-0987654321',
    roi: 0,
    priceHistory: mockPriceHistory(2000000),
    iotData: {
      height: 120,
      growthPerMonth: 5.2,
      humidity: 65,
      temperature: 18,
      pH: 6.5,
      lastUpdated: '2025-10-15T10:00:00Z'
    },
    owner: '9YRsWYqWvjnMK176Mm9S4G1MddgJHTEP2Xcmx4Umphqc',
  },
  {
    id: 'bio3',
    name: 'Trầm Hương 12 năm tuổi',
    description: 'Trầm Hương quý hiếm, hương thơm đặc trưng, giám sát bằng cảm biến độ ẩm và ánh sáng.',
    price: 10000000,
    image: 'https://bqn.1cdn.vn/2023/06/26/images.baoquangnam.vn-storage-newsportal-2023-6-26-144300-_m1.png',
    origin: 'Quảng Nam',
    farmerName: 'Lê Văn C',
    productionDate: '2013-10-01',
    age: 12,
    growthRate: 10.8,
    iotStatus: 'Đang theo dõi',
    timeline: [
      {
        title: 'Gieo trồng',
        desc: 'Trồng cây dó bầu để tạo trầm theo phương pháp tự nhiên.',
        date: '2013-10-01',
        location: 'Rừng Quảng Nam',
        responsible: ''
      },
      {
        title: 'Theo dõi IoT',
        desc: 'Cảm biến môi trường theo dõi độ ẩm và lượng ánh sáng.',
        date: '2020-07-15',
        location: 'Rừng Quảng Nam',
        responsible: ''
      },
      {
        title: 'Đạt trưởng thành',
        desc: 'Cây hình thành lõi trầm quý hiếm với độ tinh khiết cao.',
        date: '2025-02-01',
        location: 'Rừng Quảng Nam',
        responsible: ''
      },
      {
        title: 'Định giá & Token hóa',
        desc: 'Tài sản được mint NFT đại diện trên Solana.',
        date: '2025-04-15',
        location: 'Blockchain',
        responsible: ''
      }
    ],
    certifications: [
      { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      { name: 'GlobalGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
    ],
    blockchainTxId: 'tx-1122334455',
    roi: 0,
    priceHistory: mockPriceHistory(10000000),
    iotData: {
      height: 120,
      growthPerMonth: 5.2,
      humidity: 65,
      temperature: 18,
      pH: 6.5,
      lastUpdated: '2025-10-15T10:00:00Z'
    },
    owner: '9YRsWYqWvjnMK176Mm9S4G1MddgJHTEP2Xcmx4Umphqc',
  },
  {
    id: 'bio4',
    name: 'Đông Trùng Hạ Thảo 1 năm tuổi',
    description: 'Đông Trùng Hạ Thảo quý, tăng cường sức đề kháng, theo dõi bằng IoT cảm biến môi trường.',
    price: 3000000,
    image: 'https://cdn2.tuoitre.vn/thumb_w/480/471584752817336320/2023/4/3/dong-trung-ha-thao-16804830430331789436792.png',
    origin: 'Lâm Đồng',
    farmerName: 'Phạm Thị D',
    productionDate: '2024-10-01',
    age: 1,
    growthRate: 14.0,
    iotStatus: 'Đang theo dõi',
    timeline: [
      {
        title: 'Gieo trồng',
        desc: 'Nuôi cấy Đông Trùng Hạ Thảo trong môi trường kiểm soát.',
        date: '2024-10-01',
        location: 'Nông trại Lâm Đồng',
        responsible: ''
      },
      {
        title: 'Theo dõi IoT',
        desc: 'Cảm biến ghi nhận nhiệt độ 18-20°C và độ ẩm phù hợp.',
        date: '2025-01-10',
        location: 'Nông trại Lâm Đồng',
        responsible: ''
      },
      {
        title: 'Đạt trưởng thành',
        desc: 'Sản phẩm đạt dược tính cao và độ trưởng thành.',
        date: '2025-06-01',
        location: 'Nông trại Lâm Đồng',
        responsible: ''
      },
      {
        title: 'Định giá & Token hóa',
        desc: 'NFT đại diện được phát hành trên Solana.',
        date: '2025-07-15',
        location: 'Blockchain',
        responsible: ''
      }
    ],
    certifications: [
      { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
    ],
    blockchainTxId: 'tx-6677889900',
    roi: 0,
    priceHistory: mockPriceHistory(3000000),
    iotData: {
      height: 120,
      growthPerMonth: 5.2,
      humidity: 65,
      temperature: 18,
      pH: 6.5,
      lastUpdated: '2025-10-15T10:00:00Z'
    },
    owner: '9YRsWYqWvjnMK176Mm9S4G1MddgJHTEP2Xcmx4Umphqc',
  },
  {
    id: 'bio5',
    name: 'Kỳ Nam 20 năm tuổi',
    description: 'Kỳ Nam siêu quý hiếm, giá trị cao, giám sát bằng cảm biến độ ẩm và nhiệt độ.',
    price: 15000000,
    image: 'https://tramhuonghaga.com/wp-content/uploads/2024/04/ky-nam-la-gi-tram-huong-HAGA-2018.jpg',
    origin: 'Quảng Bình',
    farmerName: 'Trần Văn F',
    productionDate: '2005-10-01',
    age: 20,
    growthRate: 9.5,
    iotStatus: 'Đang theo dõi',
    timeline: [
      {
        title: 'Gieo trồng',
        desc: 'Trồng cây để tạo Kỳ Nam quý hiếm theo phương pháp tự nhiên.',
        date: '2005-10-01',
        location: 'Rừng Quảng Bình',
        responsible: ''
      },
      {
        title: 'Theo dõi IoT',
        desc: 'Cảm biến môi trường theo dõi độ ẩm và nhiệt độ.',
        date: '2018-04-20',
        location: 'Rừng Quảng Bình',
        responsible: ''
      },
      {
        title: 'Đạt trưởng thành',
        desc: 'Hình thành Kỳ Nam với hương thơm quý phái.',
        date: '2025-03-01',
        location: 'Rừng Quảng Bình',
        responsible: ''
      },
      {
        title: 'Định giá & Token hóa',
        desc: 'Tài sản được mint NFT trên Solana.',
        date: '2025-05-10',
        location: 'Blockchain',
        responsible: ''
      }
    ],
    certifications: [
      { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
    ],
    blockchainTxId: 'tx-5544332211',
    roi: 0,
    priceHistory: mockPriceHistory(15000000),
    iotData: {
      height: 120,
      growthPerMonth: 5.2,
      humidity: 65,
      temperature: 18,
      pH: 6.5,
      lastUpdated: '2025-10-15T10:00:00Z'
    },
    owner: '9YRsWYqWvjnMK176Mm9S4G1MddgJHTEP2Xcmx4Umphqc',
  },
  {
    id: 'bio6',
    name: 'Nhân Sâm 6 năm tuổi',
    description: 'Nhân Sâm quý, tăng cường sinh lực, theo dõi tăng trưởng bằng IoT.',
    price: 2500000,
    image: 'https://cdn.nhathuoclongchau.com.vn/unsafe/https://cms-prod.s3-sgn09.fptcloud.com/D_0c17fe7b38.JPG',
    origin: 'Lào Cai',
    farmerName: 'Lê Thị G',
    productionDate: '2019-10-01',
    age: 6,
    growthRate: 13.8,
    iotStatus: 'Đang theo dõi',
    timeline: [
      {
        title: 'Gieo trồng',
        desc: 'Trồng Nhân Sâm theo phương pháp hữu cơ.',
        date: '2019-10-01',
        location: 'Nông trại Lào Cai',
        responsible: ''
      },
      {
        title: 'Theo dõi IoT',
        desc: 'Cảm biến ghi nhận điều kiện môi trường tối ưu.',
        date: '2023-03-15',
        location: 'Nông trại Lào Cai',
        responsible: ''
      },
      {
        title: 'Đạt trưởng thành',
        desc: 'Củ sâm đạt chất lượng cao với dược tính mạnh.',
        date: '2025-04-01',
        location: 'Nông trại Lào Cai',
        responsible: ''
      },
      {
        title: 'Định giá & Token hóa',
        desc: 'NFT đại diện được phát hành trên Solana.',
        date: '2025-06-20',
        location: 'Blockchain',
        responsible: ''
      }
    ],
    certifications: [
      { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
    ],
    blockchainTxId: 'tx-3322110099',
    roi: 0,
    priceHistory: mockPriceHistory(2500000),
    iotData: {
      height: 120,
      growthPerMonth: 5.2,
      humidity: 65,
      temperature: 18,
      pH: 6.5,
      lastUpdated: '2025-10-15T10:00:00Z'
    },
    owner: '9YRsWYqWvjnMK176Mm9S4G1MddgJHTEP2Xcmx4Umphqc',
  },
  {
    id: 'bio7',
    name: 'Bonsai Tùng 30 năm tuổi',
    description: 'Bonsai Tùng cổ, giá trị nghệ thuật cao, giám sát bằng cảm biến môi trường.',
    price: 8000000,
    image: 'https://bonsaivietnam.com.vn/storage/tung-la-han-030.jpg',
    origin: 'Đà Nẵng',
    farmerName: 'Nguyễn Văn H',
    productionDate: '1995-10-01',
    age: 30,
    growthRate: 8.7,
    iotStatus: 'Đang theo dõi',
    timeline: [
      {
        title: 'Gieo trồng',
        desc: 'Bắt đầu uốn nắn Bonsai Tùng theo nghệ thuật.',
        date: '1995-10-01',
        location: 'Vườn Đà Nẵng',
        responsible: ''
      },
      {
        title: 'Theo dõi IoT',
        desc: 'Cảm biến theo dõi độ ẩm và ánh sáng cho cây cổ thụ.',
        date: '2015-02-10',
        location: 'Vườn Đà Nẵng',
        responsible: ''
      },
      {
        title: 'Đạt trưởng thành',
        desc: 'Cây bonsai đạt hình dáng hoàn thiện với giá trị cao.',
        date: '2025-01-15',
        location: 'Vườn Đà Nẵng',
        responsible: ''
      },
      {
        title: 'Định giá & Token hóa',
        desc: 'Tài sản được mint NFT trên Solana.',
        date: '2025-03-05',
        location: 'Blockchain',
        responsible: ''
      }
    ],
    certifications: [
      { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
    ],
    blockchainTxId: 'tx-7766554433',
    roi: 0,
    priceHistory: mockPriceHistory(8000000),
    iotData: {
      height: 120,
      growthPerMonth: 5.2,
      humidity: 65,
      temperature: 18,
      pH: 6.5,
      lastUpdated: '2025-10-15T10:00:00Z'
    },
    owner: '9YRsWYqWvjnMK176Mm9S4G1MddgJHTEP2Xcmx4Umphqc',
  },
  {
    id: 'bio8',
    name: 'Lan Phi Điệp 4 năm tuổi',
    description: 'Lan Phi Điệp đẹp quý hiếm, theo dõi tăng trưởng bằng IoT.',
    price: 1500000,
    image: 'https://greenvibes.vn/wp-content/uploads/2023/08/Hoa-lan-da-hac-phi-diep.jpg',
    origin: 'Tây Nguyên',
    farmerName: 'Trần Thị I',
    productionDate: '2021-10-01',
    age: 4,
    growthRate: 11.3,
    iotStatus: 'Đang theo dõi',
    timeline: [
      {
        title: 'Gieo trồng',
        desc: 'Nuôi trồng Lan Phi Điệp trong môi trường tự nhiên.',
        date: '2021-10-01',
        location: 'Vườn Tây Nguyên',
        responsible: ''
      },
      {
        title: 'Theo dõi IoT',
        desc: 'Cảm biến ghi nhận điều kiện phát triển hoa lan.',
        date: '2023-12-15',
        location: 'Vườn Tây Nguyên',
        responsible: ''
      },
      {
        title: 'Đạt trưởng thành',
        desc: 'Hoa lan đạt độ đẹp và quý hiếm cao.',
        date: '2025-02-10',
        location: 'Vườn Tây Nguyên',
        responsible: ''
      },
      {
        title: 'Định giá & Token hóa',
        desc: 'NFT đại diện được phát hành trên Solana.',
        date: '2025-04-01',
        location: 'Blockchain',
        responsible: ''
      }
    ],
    certifications: [
      { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
      { name: 'Organic', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
    ],
    blockchainTxId: 'tx-8877665544',
    roi: 0,
    priceHistory: mockPriceHistory(1500000),
    iotData: {
      height: 120,
      growthPerMonth: 5.2,
      humidity: 65,
      temperature: 18,
      pH: 6.5,
      lastUpdated: '2025-10-15T10:00:00Z'
    },
    owner: '9YRsWYqWvjnMK176Mm9S4G1MddgJHTEP2Xcmx4Umphqc',
  },
  {
    id: 'bio9',
    name: 'Mai Vàng Cổ Thụ 50 năm tuổi',
    description: 'Mai Vàng Cổ Thụ quý, biểu tượng Tết, giám sát bằng cảm biến cho cây cổ thụ.',
    price: 12000000,
    image: 'https://images2.thanhnien.vn/528068263637045248/2025/6/25/02-klca-nguyen-thanh-su-mai-lao-ky-nam-1-17508418111311679728793.jpg',
    origin: 'Bình Định',
    farmerName: 'Lê Văn J',
    productionDate: '1975-10-01',
    age: 50,
    growthRate: 7.9,
    iotStatus: 'Đang theo dõi',
    timeline: [
      {
        title: 'Gieo trồng',
        desc: 'Bắt đầu chăm sóc Mai Vàng theo nghệ thuật bonsai.',
        date: '1975-10-01',
        location: 'Vườn Bình Định',
        responsible: ''
      },
      {
        title: 'Theo dõi IoT',
        desc: 'Cảm biến môi trường cho cây cổ thụ lâu năm.',
        date: '2000-11-20',
        location: 'Vườn Bình Định',
        responsible: ''
      },
      {
        title: 'Đạt trưởng thành',
        desc: 'Cây đạt giá trị nghệ thuật cao và biểu tượng.',
        date: '2025-01-01',
        location: 'Vườn Bình Định',
        responsible: ''
      },
      {
        title: 'Định giá & Token hóa',
        desc: 'Tài sản được mint NFT trên Solana.',
        date: '2025-02-15',
        location: 'Blockchain',
        responsible: ''
      }
    ],
    certifications: [
      { name: 'VietGAP', file: 'data:application/pdf;base64,JVBERi0xLjAK...==' },
    ],
    blockchainTxId: 'tx-2233445566',
    roi: 0,
    priceHistory: mockPriceHistory(12000000),
    iotData: {
      height: 120,
      growthPerMonth: 5.2,
      humidity: 65,
      temperature: 18,
      pH: 6.5,
      lastUpdated: '2025-10-15T10:00:00Z'
    },
    owner: '9YRsWYqWvjnMK176Mm9S4G1MddgJHTEP2Xcmx4Umphqc',
  },
];


let users = [
  {
    email: 'farmer@gmail.com',
    password: bcrypt.hashSync('123456', 10), // Mã hóa mật khẩu
    role: 'farmer',
    name: 'Nguyen Van A',
    phone: '0901234567',
    address: '123 Đường Núi Ngọc Linh, Kon Tum',
    farmName: 'Nông trại Xanh',
    bio: 'Nông dân trồng Sâm Ngọc Linh hơn 10 năm kinh nghiệm',
    kycId: '123456789',
  },
  {
    email: 'user@gmail.com',
    password: bcrypt.hashSync('123456', 10),
    role: 'customer',
    name: 'User C',
    phone: '0912345678',
    address: '456 Đường Lê Lợi, TP.HCM',
    farmName: '', // Không bắt buộc cho customer
    bio: 'Khách hàng yêu thích sản phẩm nông nghiệp sạch',
    kycId: '987654321',
  },
];


// Mock price history function
function mockPriceHistory(basePrice) {
  const variance = basePrice * 0.1;
  return [
    { date: "2025-01-01", price: basePrice - variance * 0.2 },
    { date: "2025-02-01", price: basePrice - variance * 0.1 },
    { date: "2025-03-01", price: basePrice },
    { date: "2025-04-01", price: basePrice + variance * 0.1 },
    { date: "2025-05-01", price: basePrice + variance * 0.2 },
    { date: "2025-06-01", price: basePrice + variance * 0.15 },
    { date: "2025-07-01", price: basePrice + variance * 0.25 },
    { date: "2025-08-01", price: basePrice + variance * 0.3 },
    { date: "2025-09-01", price: basePrice + variance * 0.15 },
    { date: "2025-10-01", price: basePrice + variance * 0.4 },
  ];
}

// Ensure all products have required fields
function ensureProductFields(product) {
  return {
    id: product.id || uuidv4(),
    name: product.name || '',
    description: product.description || '',
    price: product.price || 0,
    image: product.image || '',
    origin: product.origin || '',
    farmerName: product.farmerName || '',
    productionDate: product.productionDate || '',
    age: product.age || 0,
    growthRate: product.growthRate || 0,
    iotStatus: product.iotStatus || 'Đang theo dõi',
    timeline: product.timeline || [],
    certifications: product.certifications || [],
    blockchainTxId: product.blockchainTxId || `tx-${uuidv4()}`,
    nftId: product.nftId || undefined, // Sui NFT object ID
    roi: product.roi || 0,
    priceHistory: product.priceHistory || mockPriceHistory(product.price || 0),
    iotData: {
      height: product.iotData?.height || 0,
      growthPerMonth: product.iotData?.growthPerMonth || 0,
      humidity: product.iotData?.humidity || 0,
      temperature: product.iotData?.temperature || 0,
      pH: product.iotData?.pH || 0,
      lastUpdated: product.iotData?.lastUpdated || new Date().toISOString(),
    },
  };
}

// Product Endpoints
app.get('/api/products', (req, res) => {
  res.json(products);
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const updatedProduct = req.body;
  products = products.map(p => (p.id === id ? ensureProductFields({ ...updatedProduct, id }) : p));
  const product = products.find(p => p.id === id);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Sản phẩm không tồn tại' });
  }
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  products = products.filter(p => p.id !== id);
  res.status(204).send();
});

app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const product = products.find(p => p.id === id);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ error: 'Sản phẩm không tồn tại' });
  }
});


// Authentication Endpoints
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (user && (await bcrypt.compare(password, user.password))) {
    res.json(user);
  } else {
    res.status(401).json({ error: 'Sai thông tin đăng nhập' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.status(204).send();
});

app.post('/api/auth/register', async (req, res) => {
  const {
    email,
    password,
    role,
    fullName,
    phone,
    address,
    farmName,
    bio,
    kycId,
    suiAddress,
  } = req.body;

  // Kiểm tra email đã tồn tại
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email đã được sử dụng' });
  }

  // Mã hóa mật khẩu
  const hashedPassword = await bcrypt.hash(password, 10);

  // Tạo người dùng mới
  const newUser = {
    email,
    password: hashedPassword,
    role,
    name: fullName,
    phone,
    address,
    farmName: role === 'farmer' ? farmName : '', 
    bio: bio || '',
    kycId: kycId || '',
    suiAddress: suiAddress || '',
  };

  users.push(newUser);
  res.status(201).json(newUser);
});

// Wallet Endpoint
app.get('/api/wallet', (req, res) => {
  res.json(wallet);
});

app.post('/upload-ipfs', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('Uploading file:', req.file.originalname, req.file.path, req.file.size);
    const readableStream = fs.createReadStream(req.file.path);
    const options = { pinataMetadata: { name: req.file.originalname } };
    const result = await pinata.pinFileToIPFS(readableStream, options);
    console.log('Pinata response:', result);
    fs.unlinkSync(req.file.path);
    res.json({ cid: result.IpfsHash });
  } catch (error) {
    console.error('Error uploading to Pinata:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to upload to IPFS', details: error.message });
  }
});

// Endpoint to upload JSON (metadata) to Pinata IPFS
app.post('/upload-json-ipfs', async (req, res) => {
  try {
    const jsonData = req.body.json;
    if (!jsonData) {
      return res.status(400).json({ error: 'No JSON data provided' });
    }
    const options = {
      pinataMetadata: {
        name: 'NFT Metadata',
      },
    };
    const result = await pinata.pinJSONToIPFS(jsonData, options);
    res.json({ cid: result.IpfsHash });
  } catch (error) {
    console.error('Error uploading JSON to Pinata:', error);
    res.status(500).json({ error: 'Failed to upload JSON to IPFS' });
  }
});

const getCurrentUser = (email) => users.find(u => u.email === email);

// ==================== CẬP NHẬT ENDPOINTS ====================

// Endpoint để frontend gửi địa chỉ ví sau khi connect Sui wallet
app.post('/api/wallet/connect', (req, res) => {
  const { email, suiAddress } = req.body;

  if (!email || !suiAddress) {
    return res.status(400).json({ error: 'Thiếu email hoặc suiAddress' });
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  }

  // Cập nhật địa chỉ ví thực tế từ Sui wallet
  user.suiAddress = suiAddress;

  res.json({
    message: 'Kết nối ví thành công',
    suiAddress: user.suiAddress,
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
      suiAddress: user.suiAddress,
    }
  });
});

app.post('/api/wallet', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Thiếu email' });
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  }

  res.json({
    suiAddress: user.suiAddress || null,
  });
});

app.post('/api/products', (req, res) => {
  const { email, ...productData } = req.body; 

  if (!email) {
    return res.status(400).json({ error: 'Thiếu thông tin người dùng' });
  }

  const user = users.find(u => u.email === email);
  if (!user || user.role !== 'farmer') {
    return res.status(403).json({ error: 'Chỉ farmer mới được tạo sản phẩm' });
  }

  if (!user.suiAddress) {
    // Temporarily comment out for testing
    // return res.status(400).json({ error: 'Vui lòng kết nối ví Sui trước khi tạo sản phẩm' });
  }

  const id = uuidv4();
  const mintAddress = productData.mintAddress || `MINT-${id.substring(0,8)}`;
  const blockchainTxId = `tx-${uuidv4()}`;

  const product = ensureProductFields({
    ...productData,
    id,
    blockchainTxId,
    farmerName: user.name,
    mint: mintAddress,
    updateAuthority: user.suiAddress,
    creators: [
      {
        address: user.suiAddress,
        verified: 1,
        share: 100
      }
    ],
    owner: user.suiAddress  
  });

  products.push(product);
  res.status(201).json(product);
});

let orders = [];

app.get('/api/orders', (req, res) => {
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  const newOrder = {
    id: uuidv4(),
    ...req.body,
    date: new Date().toISOString(),
    status: 'pending',
  };
  orders.push(newOrder);
  console.log('New order created:', newOrder);
  res.status(201).json(newOrder);
});

app.put('/api/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = orders.find(o => o.id === id);
  if (!order) {
    return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  }

  order.status = status;
  console.log(`Order ${id} status updated to: ${status}`);
  res.json(order);
});

app.post('/api/burn-nft', (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'Thiếu productId' });
  }

  const productIndex = products.findIndex(p => p.id === productId);
  if (productIndex === -1) {
    return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  }

  product.sold = true;           // Thêm trường sold: true
  product.owner = null;          // Không còn chủ sở hữu
  product.burnedAt = new Date().toISOString(); // Optional: thời gian burn

  console.log(`NFT ${productId} đã được burn (mua đứt). Đánh dấu sold = true`);
  res.json({ 
    success: true, 
    message: `NFT đã được burn thành công. Sản phẩm được đánh dấu là đã bán.`,
  });
});

// Endpoint mô phỏng chuyển quyền sở hữu NFT (khi mua dài hạn)
app.post('/api/transfer-ownership', (req, res) => {
  const { productId, newOwner } = req.body;

  if (!productId || !newOwner) {
    return res.status(400).json({ error: 'Thiếu productId hoặc newOwner' });
  }

  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  }

  // Cập nhật chủ sở hữu mới (địa chỉ ví của nhà đầu tư)
  product.owner = newOwner;

  console.log(`✅ Quyền sở hữu NFT ${productId} đã chuyển cho: ${newOwner}`);
  res.json({ 
    success: true, 
    message: `Quyền sở hữu đã chuyển thành công`,
    newOwner: newOwner 
  });
});

app.post('/api/verify-transaction', async (req, res) => {
  const { signature } = req.body;
  try {
    const connection = new web3.Connection('https://api.devnet.solana.com');
    const status = await connection.getSignatureStatus(signature);
    if (status.value?.confirmationStatus === 'confirmed') {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Giao dịch chưa được xác nhận' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Lỗi xác nhận giao dịch' });
  }
});


// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});