export interface Lead {
  id: number;
  name: string;
  phone: string;
  municipality: string;
  crop: string;
  farm_size: string;
  problem: string;
  created_at: string;
}

export interface LeadInput {
  name: string;
  phone: string;
  municipality: string;
  crop: string;
  farmSize: string;
  problem: string;
}
