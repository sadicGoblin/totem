import { Routes } from '@angular/router';

export const routes: Routes = [
    {path: 'home', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)},
    {path: 'category', loadComponent: () => import('./components/category/category.component').then(m => m.CategoryComponent)},
    {path: 'cart', loadComponent: () => import('./pages/mobile-cart/mobile-cart.component').then(m => m.MobileCartComponent)},
    {path: 'checkout', loadComponent: () => import('./pages/checkout/checkout.component').then(m => m.CheckoutComponent)},
    {path: 'payment', loadComponent: () => import('./pages/payment/payment.component').then(m => m.PaymentComponent)},
    {path: '', redirectTo: 'category', pathMatch: 'full'},
];
