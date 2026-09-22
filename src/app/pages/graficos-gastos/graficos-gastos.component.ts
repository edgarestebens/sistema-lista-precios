import { Component, OnInit, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BaseChartDirective, provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { Gasto } from '../../models/models';
import { toSpanishError } from '../../core/es-error';
import { AlertService } from '../../services/alert.service';
import { GastosService } from '../../services/gastos.service';
import { ParametrosService } from '../../services/parametros.service';

const CHART_COLORS = [
  '#6b1a1a',
  '#c62828',
  '#ef6c00',
  '#f9a825',
  '#2e7d32',
  '#00838f',
  '#1565c0',
  '#6a1b9a',
  '#546e7a',
];

@Component({
  selector: 'app-graficos-gastos',
  standalone: true,
  imports: [FormsModule, RouterLink, BaseChartDirective],
  providers: [provideCharts(withDefaultRegisterables())],
  templateUrl: './graficos-gastos.component.html',
  styleUrl: './graficos-gastos.component.css',
})
export class GraficosGastosComponent implements OnInit {
  gastos = signal<Gasto[]>([]);
  loading = signal(true);
  fechaDesde = signal('');
  fechaHasta = signal('');
  saldoGasto = signal(600_000);

  readonly gastosFiltrados = computed(() => {
    const desde = this.fechaDesde().trim();
    const hasta = this.fechaHasta().trim();
    return this.gastos().filter((g) => {
      if (desde && g.fecha < desde) return false;
      if (hasta && g.fecha > hasta) return false;
      return true;
    });
  });

  readonly rangoActivo = computed(
    () => !!(this.fechaDesde().trim() || this.fechaHasta().trim())
  );

  readonly totalValor = computed(() =>
    this.gastosFiltrados().reduce((sum, g) => sum + Number(g.valor || 0), 0)
  );

  readonly porDia = computed(() => {
    const map = new Map<string, number>();
    for (const g of this.gastosFiltrados()) {
      map.set(g.fecha, (map.get(g.fecha) ?? 0) + Number(g.valor || 0));
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, total]) => ({ fecha, total }));
  });

  readonly porConcepto = computed(() => {
    const map = new Map<string, number>();
    for (const g of this.gastosFiltrados()) {
      const key = g.concepto.trim() || 'Sin concepto';
      map.set(key, (map.get(key) ?? 0) + Number(g.valor || 0));
    }
    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length <= 8) {
      return sorted.map(([concepto, total]) => ({ concepto, total }));
    }
    const top = sorted.slice(0, 8);
    const otros = sorted.slice(8).reduce((sum, [, t]) => sum + t, 0);
    return [
      ...top.map(([concepto, total]) => ({ concepto, total })),
      { concepto: 'Otros', total: otros },
    ];
  });

  readonly barDiaData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const rows = this.porDia();
    return {
      labels: rows.map((r) => this.formatFechaCorta(r.fecha)),
      datasets: [
        {
          data: rows.map((r) => r.total),
          label: 'Gasto',
          backgroundColor: '#6b1a1a',
          borderRadius: 4,
        },
      ],
    };
  });

  readonly conceptoData = computed<ChartConfiguration<'doughnut'>['data']>(
    () => {
      const rows = this.porConcepto();
      return {
        labels: rows.map((r) => r.concepto),
        datasets: [
          {
            data: rows.map((r) => r.total),
            backgroundColor: rows.map(
              (_, i) => CHART_COLORS[i % CHART_COLORS.length]
            ),
            borderWidth: 0,
          },
        ],
      };
    }
  );

  readonly saldoData = computed<ChartConfiguration<'doughnut'>['data']>(() => {
    const gastado = this.totalValor();
    const restante = Math.max(this.saldoGasto() - gastado, 0);
    const exceso = Math.max(gastado - this.saldoGasto(), 0);
    if (exceso > 0) {
      return {
        labels: ['Presupuesto', 'Exceso'],
        datasets: [
          {
            data: [this.saldoGasto(), exceso],
            backgroundColor: ['#2e7d32', '#c62828'],
            borderWidth: 0,
          },
        ],
      };
    }
    return {
      labels: ['Gastado', 'Disponible'],
      datasets: [
        {
          data: [gastado, restante],
          backgroundColor: ['#6b1a1a', '#2e7d32'],
          borderWidth: 0,
        },
      ],
    };
  });

  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => this.formatValor(Number(ctx.raw ?? 0)),
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#8a8a8a', maxRotation: 45, minRotation: 0 },
        grid: { color: '#2a2a2a' },
      },
      y: {
        ticks: {
          color: '#8a8a8a',
          callback: (v) => this.formatValorCorto(Number(v)),
        },
        grid: { color: '#2a2a2a' },
      },
    },
  };

  readonly doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#cfcfcf', boxWidth: 12, padding: 12 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.label ?? '';
            const value = this.formatValor(Number(ctx.raw ?? 0));
            return `${label}: ${value}`;
          },
        },
      },
    },
  };

  constructor(
    private gastosService: GastosService,
    private parametrosService: ParametrosService,
    private alert: AlertService
  ) {}

  async ngOnInit(): Promise<void> {
    this.aplicarRangoPorDefecto();
    await this.load();
  }

  /** Del 15 del mes actual al 15 del mes siguiente. */
  aplicarRangoPorDefecto(ref: Date = new Date()): void {
    const y = ref.getFullYear();
    const month = ref.getMonth();
    const iso = (year: number, m: number, d: number) =>
      `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const next = new Date(y, month + 1, 15);
    this.fechaDesde.set(iso(y, month, 15));
    this.fechaHasta.set(iso(next.getFullYear(), next.getMonth(), 15));
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [gastos, parametro] = await Promise.all([
        this.gastosService.list(),
        this.parametrosService.get(),
      ]);
      this.gastos.set(gastos);
      this.saldoGasto.set(Number(parametro.saldo_gasto) || 0);
    } catch (e) {
      await this.alert.error(toSpanishError(e, 'Error al cargar'));
    } finally {
      this.loading.set(false);
    }
  }

  onFechaDesdeChange(value: string): void {
    this.fechaDesde.set(value);
  }

  onFechaHastaChange(value: string): void {
    this.fechaHasta.set(value);
  }

  clearFechaFilter(): void {
    this.fechaDesde.set('');
    this.fechaHasta.set('');
  }

  formatFechaCorta(fecha: string): string {
    const [, m, d] = fecha.split('-');
    if (!m || !d) return fecha;
    return `${d}/${m}`;
  }

  formatValor(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(valor);
  }

  formatValorCorto(valor: number): string {
    if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
    if (valor >= 1_000) return `${Math.round(valor / 1_000)}k`;
    return String(valor);
  }
}
