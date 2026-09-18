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
  market_id?: string | null;
  lista_nombre?: string;
  user_id?: string;
  created_at: string;
}

export interface Mercado {
  id: string;
  nombre: string;
  user_id?: string;
  created_at: string;
}

export interface ComparativoPrecio {
  id: string;
  producto_id: string;
  mercado_id: string;
  precio: number;
  user_id?: string;
  created_at: string;
  producto?: { nombre: string } | null;
  mercado?: { nombre: string } | null;
}

/** Vista agrupada: un producto con precios por mercado. */
export interface ComparativoProducto {
  producto_id: string;
  producto_nombre: string;
  precios: Record<string, number>;
}

/** Precio más bajo (> 0) de un producto en el comparativo. */
export interface PrecioMasBarato {
  producto_id: string;
  precio: number;
  mercado_nombre: string;
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
