import { Routes } from '@angular/router';

export const routes: Routes = [
    {path: 'welcome', loadComponent: () => import('./pages/welcome/welcome.component').then(m => m.WelcomeComponent)},
    {path: 'order-type', loadComponent: () => import('./pages/order-type/order-type.component').then(m => m.OrderTypeComponent)},
    {path: 'home', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent)},
    {path: 'category', loadComponent: () => import('./components/category/category.component').then(m => m.CategoryComponent)},
    {path: 'checkout', loadComponent: () => import('./pages/checkout/checkout.component').then(m => m.CheckoutComponent)},
    {path: 'payment', loadComponent: () => import('./pages/payment/payment.component').then(m => m.PaymentComponent)},
    {path: 'payment-simple', loadComponent: () => import('./pages/payment-simple/payment-simple.component').then(m => m.PaymentSimpleComponent)},
    {path: '', redirectTo: 'welcome', pathMatch: 'full'},
    {path: '**', redirectTo: 'welcome'}
];
