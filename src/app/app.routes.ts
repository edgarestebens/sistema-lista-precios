import { Routes } from '@angular/router';
import { MarketsComponent } from './pages/markets/markets.component';
import { ItemsComponent } from './pages/items/items.component';
import { LoginComponent } from './pages/login/login.component';
import { ProductosComponent } from './pages/productos/productos.component';
import { MercadosComponent } from './pages/mercados/mercados.component';
import { ComparativoPrecioComponent } from './pages/comparativo-precio/comparativo-precio.component';
import { GastosComponent } from './pages/gastos/gastos.component';
import { ParametrosComponent } from './pages/parametros/parametros.component';
import { GraficosGastosComponent } from './pages/graficos-gastos/graficos-gastos.component';
import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: '', component: MarketsComponent, canActivate: [authGuard] },
  { path: 'productos', component: ProductosComponent, canActivate: [authGuard] },
  { path: 'mercados', component: MercadosComponent, canActivate: [authGuard] },
  {
    path: 'comparativo-precio',
    component: ComparativoPrecioComponent,
    canActivate: [authGuard],
  },
  { path: 'gastos', component: GastosComponent, canActivate: [authGuard] },
  { path: 'parametros', component: ParametrosComponent, canActivate: [authGuard] },
  {
    path: 'graficos-gastos',
    component: GraficosGastosComponent,
    canActivate: [authGuard],
  },
  { path: 'mercados/:id', component: ItemsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
