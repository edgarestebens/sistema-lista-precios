import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  ComparativoProducto,
  Mercado,
  Producto,
} from '../../models/models';
import { toSpanishError } from '../../core/es-error';
import { ComparativoPrecioService } from '../../services/comparativo-precio.service';
import { MercadosService } from '../../services/mercados.service';
import { ProductosService } from '../../services/productos.service';

@Component({
  selector: 'app-comparativo-precio',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './comparativo-precio.component.html',
  styleUrl: './comparativo-precio.component.css',
})
export class ComparativoPrecioComponent implements OnInit {
  filas = signal<ComparativoProducto[]>([]);
  productos = signal<Producto[]>([]);
  mercados = signal<Mercado[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showForm = signal(false);
  saving = signal(false);
  deletingId = signal<string | null>(null);
  editingProductoId = signal<string | null>(null);
  selectedProductoId = '';
  /** preciosPorMercado[mercadoId] = precio */
  preciosForm: Record<string, number> = {};

  readonly productosDisponibles = computed(() => {
    const usados = new Set(this.filas().map((f) => f.producto_id));
    return this.productos().filter((p) => !usados.has(p.id));
  });

  readonly canCreate = computed(
    () => this.productos().length > 0 && this.mercados().length > 0
  );

  constructor(
    private comparativoService: ComparativoPrecioService,
    private productosService: ProductosService,
    private mercadosService: MercadosService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [filas, productos, mercados] = await Promise.all([
        this.comparativoService.listGrouped(),
        this.productosService.list(),
        this.mercadosService.list(),
      ]);
      this.filas.set(filas);
      this.productos.set(productos);
      this.mercados.set(mercados);
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al cargar'));
    } finally {
      this.loading.set(false);
    }
  }

  precioDe(fila: ComparativoProducto, mercadoId: string): number {
    return fila.precios[mercadoId] ?? 0;
  }

  /** 'barato' | 'caro' | null — ignora ceros; solo si hay al menos 2 precios > 0 distintos. */
  clasePrecio(fila: ComparativoProducto, mercadoId: string): string | null {
    const precio = this.precioDe(fila, mercadoId);
    if (precio <= 0) return null;

    const precios = this.mercados()
      .map((m) => this.precioDe(fila, m.id))
      .filter((p) => p > 0);
    if (precios.length < 2) return null;

    const min = Math.min(...precios);
    const max = Math.max(...precios);
    if (min === max) return null;

    if (precio === min) return 'barato';
    if (precio === max) return 'caro';
    return null;
  }

  nombreProductoEditando(): string {
    const id = this.editingProductoId();
    if (!id) return '';
    return this.productos().find((p) => p.id === id)?.nombre ?? '';
  }

  formatPrecio(value: number): string {
    return value.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  openAdd(): void {
    if (!this.canCreate()) {
      this.error.set(
        'Necesitas al menos un producto y un mercado en el catálogo.'
      );
      return;
    }
    if (this.productosDisponibles().length === 0) {
      this.error.set('Todos los productos ya tienen comparativo.');
      return;
    }
    this.editingProductoId.set(null);
    this.selectedProductoId = '';
    this.preciosForm = {};
    for (const m of this.mercados()) {
      this.preciosForm[m.id] = 0;
    }
    this.error.set(null);
    this.showForm.set(true);
  }

  openEdit(event: Event, fila: ComparativoProducto): void {
    event.stopPropagation();
    this.editingProductoId.set(fila.producto_id);
    this.selectedProductoId = fila.producto_id;
    this.preciosForm = {};
    for (const m of this.mercados()) {
      this.preciosForm[m.id] = this.precioDe(fila, m.id);
    }
    this.error.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingProductoId.set(null);
    this.selectedProductoId = '';
    this.preciosForm = {};
  }

  async save(): Promise<void> {
    if (this.saving()) return;
    const productoId = this.editingProductoId() ?? this.selectedProductoId.trim();
    if (!productoId) {
      this.error.set('Debes elegir un producto.');
      return;
    }
    if (this.mercados().length === 0) {
      this.error.set('No hay mercados registrados.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    try {
      const precios = this.mercados().map((m) => ({
        mercado_id: m.id,
        precio: Number(this.preciosForm[m.id]) || 0,
      }));
      await this.comparativoService.saveForProducto(productoId, precios);
      await this.load();
      this.closeForm();
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al guardar'));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteFila(event: Event, fila: ComparativoProducto): Promise<void> {
    event.stopPropagation();
    if (!confirm(`¿Eliminar el comparativo de "${fila.producto_nombre}"?`)) {
      return;
    }
    this.deletingId.set(fila.producto_id);
    try {
      await this.comparativoService.removeByProducto(fila.producto_id);
      this.filas.update((list) =>
        list.filter((f) => f.producto_id !== fila.producto_id)
      );
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al eliminar'));
    } finally {
      this.deletingId.set(null);
    }
  }
}
