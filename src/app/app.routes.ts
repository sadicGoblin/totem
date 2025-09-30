import { Routes } from '@angular/router';

export const routes: Routes = [
    {path: 'cart', loadComponent: () => import('./pages/mobile-cart/mobile-cart.component').then(m => m.MobileCartComponent)},
    {path: 'category', loadComponent: () => import('./components/category/category.component').then(m => m.CategoryComponent)},
    {path: 'home', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)},
    {path: '', redirectTo: 'category', pathMatch: 'full'},
];
