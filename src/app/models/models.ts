export interface Market {
  id: string;
  name: string;
  position: number;
  created_at: string;
  user_id?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  user_id?: string;
  created_at: string;
}

export interface Mercado {
  id: string;
  nombre: string;
  user_id?: string;
  created_at: string;
}

export interface Item {
  id: string;
  market_id: string;
  producto_id: string;
  nombre: string;
  is_checked: boolean;
  position: number;
  created_at: string;
  user_id?: string;
}
