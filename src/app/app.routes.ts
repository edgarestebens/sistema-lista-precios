import { Routes } from '@angular/router';
import { MarketsComponent } from './pages/markets/markets.component';
import { ItemsComponent } from './pages/items/items.component';
import { LoginComponent } from './pages/login/login.component';
import { ProductosComponent } from './pages/productos/productos.component';
import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: '', component: MarketsComponent, canActivate: [authGuard] },
  { path: 'productos', component: ProductosComponent, canActivate: [authGuard] },
  { path: 'mercados/:id', component: ItemsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
