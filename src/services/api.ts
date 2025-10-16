import { Connection, Keypair, Transaction, SystemProgram } from '@solana/web3.js';
import type { Order, Product } from '../types/types';

const PRODUCTS_KEY = 'products';

// Giả lập dữ liệu giá lịch sử
const mockPriceHistory = (basePrice: number) => {
  const variance = basePrice * 0.1; // Biến động giá ±10%
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
};

const initialProducts: Product[] = [
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
    quantity: 50,
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
  height: 120, // cm
  growthPerMonth: 5.2, // cm/tháng
  humidity: 65,
  temperature: 18,
  pH: 6.5,
  lastUpdated: '2025-10-15T10:00:00Z'
},
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
    quantity: 100,
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
  height: 120, // cm
  growthPerMonth: 5.2, // cm/tháng
  humidity: 65,
  temperature: 18,
  pH: 6.5,
  lastUpdated: '2025-10-15T10:00:00Z'
},
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
    quantity: 20,
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
  height: 120, // cm
  growthPerMonth: 5.2, // cm/tháng
  humidity: 65,
  temperature: 18,
  pH: 6.5,
  lastUpdated: '2025-10-15T10:00:00Z'
},
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
    quantity: 80,
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
  height: 120, // cm
  growthPerMonth: 5.2, // cm/tháng
  humidity: 65,
  temperature: 18,
  pH: 6.5,
  lastUpdated: '2025-10-15T10:00:00Z'
},
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
    quantity: 10,
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
  height: 120, // cm
  growthPerMonth: 5.2, // cm/tháng
  humidity: 65,
  temperature: 18,
  pH: 6.5,
  lastUpdated: '2025-10-15T10:00:00Z'
},
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
    quantity: 70,
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
  height: 120, // cm
  growthPerMonth: 5.2, // cm/tháng
  humidity: 65,
  temperature: 18,
  pH: 6.5,
  lastUpdated: '2025-10-15T10:00:00Z'
},
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
    quantity: 30,
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
  height: 120, // cm
  growthPerMonth: 5.2, // cm/tháng
  humidity: 65,
  temperature: 18,
  pH: 6.5,
  lastUpdated: '2025-10-15T10:00:00Z'
},
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
    quantity: 40,
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
  height: 120, // cm
  growthPerMonth: 5.2, // cm/tháng
  humidity: 65,
  temperature: 18,
  pH: 6.5,
  lastUpdated: '2025-10-15T10:00:00Z'
},
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
    quantity: 15,
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
  height: 120, // cm
  growthPerMonth: 5.2, // cm/tháng
  humidity: 65,
  temperature: 18,
  pH: 6.5,
  lastUpdated: '2025-10-15T10:00:00Z'
},
  },
];



function getProducts(): Product[] {
  const stored = localStorage.getItem(PRODUCTS_KEY);
  if (stored) {
    return JSON.parse(stored);
  } else {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(initialProducts));
    return initialProducts;
  }
}


// Lấy danh sách sản phẩm
export const fetchProducts = async (): Promise<Product[]> => {
  return getProducts();
};

// Thêm sản phẩm mới
export const addProduct = async (newProduct: Omit<Product, 'id' | 'blockchainTxId'>, blockchainTxId: string): Promise<Product> => {
  const products = getProducts();
  const id = (products.length + 1).toString();
  const product: Product = { ...newProduct, id, blockchainTxId };
  products.push(product);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  return product;
};

// Cập nhật sản phẩm
export const updateProduct = async (updatedProduct: Product): Promise<void> => {
  let products = getProducts();
  products = products.map(p => (p.id === updatedProduct.id ? updatedProduct : p));
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

// Xóa sản phẩm
export const deleteProduct = async (id: string): Promise<void> => {
  let products = getProducts();
  products = products.filter(p => p.id !== id);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

// Lấy sản phẩm theo ID (cho trang ProductDetail)
export const fetchProductById = async (id: string): Promise<Product | null> => {
  const products = getProducts();
  return products.find(p => p.id === id) || null;
};

export const fetchOrders = async (): Promise<Order[]> => {
  const stored = localStorage.getItem('orders');
  return stored ? JSON.parse(stored) : [];
};

export const addOrder = async (order: Order): Promise<void> => {
  const orders = await fetchOrders();
  const updated = [...orders, order];
  localStorage.setItem('orders', JSON.stringify(updated));

  // Update product quantities
  const products = await fetchProducts();
  const updatedProducts = products.map((p) => {
    const orderItem = order.items.find((item) => item.productId === p.id);
    if (orderItem) {
      return { ...p, quantity: p.quantity - orderItem.quantity };
    }
    return p;
  });
  localStorage.setItem('products', JSON.stringify(updatedProducts));
};