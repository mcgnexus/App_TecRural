export interface Lead {
  id: number;
  name: string;
  phone: string;
  municipality: string;
  crop: string;
  farm_size: string;
  problem: string;
  alerts_consent: boolean;
  marketing_consent: boolean;
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
  alertsConsent: boolean;
  marketingConsent: boolean;
}
