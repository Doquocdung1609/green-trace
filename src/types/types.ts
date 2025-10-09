// types.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  origin: string;
  farmerName: string;
  productionDate: string;
  timeline: TimelineStep[];
  inStock: boolean;
  quantity: number;
  description: string;
  certifications: string[];
  blockchainTxId: string;
}

export interface TimelineStep {
  title: string;
  desc: string;
  date: string;
  location?: string;
  responsible?: string;
  details?: string;
}