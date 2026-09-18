export interface Market {
  id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface Item {
  id: string;
  market_id: string;
  name: string;
  is_checked: boolean;
  position: number;
  created_at: string;
}
