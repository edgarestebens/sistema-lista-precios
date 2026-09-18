import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Producto } from '../../models/models';
import { toSpanishError } from '../../core/es-error';
import { ProductosService } from '../../services/productos.service';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.css',
})
export class ProductosComponent implements OnInit {
  productos = signal<Producto[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showForm = signal(false);
  formName = '';
  editingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  saving = signal(false);

  constructor(private productosService: ProductosService) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.productos.set(await this.productosService.list());
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al cargar'));
    } finally {
      this.loading.set(false);
    }
  }

  openAdd(): void {
    this.editingId.set(null);
    this.formName = '';
    this.error.set(null);
    this.showForm.set(true);
  }

  openEdit(event: Event, producto: Producto): void {
    event.stopPropagation();
    event.preventDefault();
    this.editingId.set(producto.id);
    this.formName = producto.nombre;
    this.error.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.formName = '';
    this.editingId.set(null);
  }

  private nombreYaExiste(nombre: string, excludeId: string | null): boolean {
    const normalized = nombre.trim().toLocaleLowerCase('es');
    return this.productos().some(
      (p) =>
        p.id !== excludeId &&
        p.nombre.trim().toLocaleLowerCase('es') === normalized
    );
  }

  async saveProducto(): Promise<void> {
    const nombre = this.formName.trim();
    if (!nombre || this.saving()) return;
    const editId = this.editingId();
    if (this.nombreYaExiste(nombre, editId)) {
      this.error.set('Ese producto ya existe en la lista.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      if (editId) {
        await this.productosService.rename(editId, nombre);
        this.productos.update((list) =>
          list
            .map((p) => (p.id === editId ? { ...p, nombre } : p))
            .sort((a, b) =>
              a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
            )
        );
      } else {
        const producto = await this.productosService.create(nombre);
        this.productos.update((list) =>
          [...list, producto].sort((a, b) =>
            a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
          )
        );
      }
      this.closeForm();
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al guardar'));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteProducto(event: Event, producto: Producto): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    if (!confirm(`¿Eliminar el producto "${producto.nombre}"?`)) return;
    this.deletingId.set(producto.id);
    try {
      await this.productosService.remove(producto.id);
      this.productos.update((list) => list.filter((p) => p.id !== producto.id));
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al eliminar'));
    } finally {
      this.deletingId.set(null);
    }
  }
}
