import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Mercado } from '../../models/models';
import { toSpanishError } from '../../core/es-error';
import { MercadosService } from '../../services/mercados.service';

@Component({
  selector: 'app-mercados',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './mercados.component.html',
  styleUrl: './mercados.component.css',
})
export class MercadosComponent implements OnInit {
  mercados = signal<Mercado[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  showForm = signal(false);
  formName = '';
  editingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  saving = signal(false);

  constructor(private mercadosService: MercadosService) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.mercados.set(await this.mercadosService.list());
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

  openEdit(event: Event, mercado: Mercado): void {
    event.stopPropagation();
    event.preventDefault();
    this.editingId.set(mercado.id);
    this.formName = mercado.nombre;
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
    return this.mercados().some(
      (m) =>
        m.id !== excludeId &&
        m.nombre.trim().toLocaleLowerCase('es') === normalized
    );
  }

  async saveMercado(): Promise<void> {
    const nombre = this.formName.trim();
    if (!nombre || this.saving()) return;
    const editId = this.editingId();
    if (this.nombreYaExiste(nombre, editId)) {
      this.error.set('Ese mercado ya existe en la lista.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    try {
      if (editId) {
        await this.mercadosService.rename(editId, nombre);
        this.mercados.update((list) =>
          list
            .map((m) => (m.id === editId ? { ...m, nombre } : m))
            .sort((a, b) =>
              a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
            )
        );
      } else {
        const mercado = await this.mercadosService.create(nombre);
        this.mercados.update((list) =>
          [...list, mercado].sort((a, b) =>
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

  async deleteMercado(event: Event, mercado: Mercado): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    if (!confirm(`¿Eliminar el mercado "${mercado.nombre}"?`)) return;
    this.deletingId.set(mercado.id);
    try {
      await this.mercadosService.remove(mercado.id);
      this.mercados.update((list) => list.filter((m) => m.id !== mercado.id));
    } catch (e) {
      this.error.set(toSpanishError(e, 'Error al eliminar'));
    } finally {
      this.deletingId.set(null);
    }
  }
}
