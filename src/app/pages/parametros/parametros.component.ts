import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { toSpanishError } from '../../core/es-error';
import { AlertService } from '../../services/alert.service';
import { ParametrosService } from '../../services/parametros.service';

@Component({
  selector: 'app-parametros',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './parametros.component.html',
  styleUrl: './parametros.component.css',
})
export class ParametrosComponent implements OnInit {
  loading = signal(true);
  saving = signal(false);
  formSaldoGasto: number | null = null;

  constructor(
    private parametrosService: ParametrosService,
    private alert: AlertService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const parametro = await this.parametrosService.get();
      this.formSaldoGasto = Number(parametro.saldo_gasto);
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'Error al cargar'));
    } finally {
      this.loading.set(false);
    }
  }

  get formValid(): boolean {
    const valor = this.formSaldoGasto;
    return (
      valor !== null &&
      valor !== undefined &&
      !Number.isNaN(Number(valor)) &&
      Number(valor) >= 0
    );
  }

  async save(): Promise<void> {
    if (!this.formValid || this.saving()) return;
    this.saving.set(true);
    try {
      await this.parametrosService.updateSaldoGasto(Number(this.formSaldoGasto));
      await this.alert.success('Documento modificado exitosamente');
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'Error al guardar'));
    } finally {
      this.saving.set(false);
    }
  }
}
