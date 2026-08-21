export interface Lead {
  id: number;
  name: string;
  phone: string;
  municipality: string;
  crop: string;
  farm_size: string;
  problem: string;
  created_at: string;
  responded_at: string | null;
}

export interface LeadInput {
  name: string;
  phone: string;
  municipality: string;
  crop: string;
  farmSize: string;
  problem: string;
}
