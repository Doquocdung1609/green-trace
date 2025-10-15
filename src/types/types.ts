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
  quantity: number;
  timeline: TimelineEntry[];
  certifications: Certification[];
  blockchainTxId: string;
  growthRate: number;     // % tăng trưởng giá trị / năm
  age: number;            // Tuổi của cây hoặc vật nuôi (năm)
  iotStatus: 'Đang theo dõi' | 'Ngưng theo dõi' | 'Lỗi cảm biến'; // trạng thái IoT
  priceHistory?: { date: string; price: number }[];
}


export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  lat?: number;
  lng?: number;
  total: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  items: { productId: string; quantity: number; price: number }[];
}

export interface CarbonCredit {
  id: string;
  name: string;
  description: string;
  image: string;
  projectType: 'Reforestation' | 'Renewable Energy' | 'Mangrove Restoration' | 'Organic Farming';
  origin: string;
  organization: string;
  issueDate: string;
  co2OffsetTons: number; // Lượng CO₂ hấp thụ hoặc giảm thải
  pricePerTon: number; // Giá cho mỗi tấn CO₂
  certifications: Certification[];
  timeline: TimelineEntry[];
  blockchainTxId: string;
}
