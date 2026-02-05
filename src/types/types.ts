export interface TimelineEntry {
  title: string;
  desc: string;
  date: string;
  location: string;
  responsible: string;
  details?: string;
}

export interface Certification {
  name: string;
  file: string; // Base64 string for image or PDF
}

export interface Product {
  id: string;
  name: string;
  description: string;
  roi: number;
  price: number;
  image: string;
  origin: string;
  farmerName: string;
  productionDate: string;
  timeline: TimelineEntry[];
  certifications: Certification[];
  blockchainTxId: string;
  nftId?: string; // Sui object ID of the NFT
  growthRate: number;     // % tăng trưởng giá trị / năm
  age: number;            // Tuổi của cây hoặc vật nuôi (năm)
  iotStatus: 'Đang theo dõi' | 'Ngưng theo dõi' | 'Lỗi cảm biến'; // trạng thái IoT
  iotData: {
    height: number; // cm
    growthPerMonth: number; // cm/tháng
    humidity: number; // %
    temperature: number; // °C
    pH: number;
    lastUpdated: string; // ISO date
  };
  priceHistory?: { date: string; price: number }[];
  sold?: boolean;           
  burnedAt?: string;
}


export interface OrderItem {
  productId: string;
  price: number;
  buyType: 'dut' | 'longterm'; // 'dut' = mua đứt (burn NFT), 'longterm' = mua dài hạn (transfer ownership)
}

// Cập nhật Order với trạng thái chi tiết hơn và items có buyType
export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
  total: number; // Tổng tiền bằng VND
  date: string; // ISO string
  status: 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';
  items: OrderItem[];
}

