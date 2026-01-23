import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ThemeConfig, HomeTheme, GlobalTheme, WelcomeTheme, ProductModalTheme, CartFloatingTheme, CheckoutTheme, PaymentTheme, ConfirmModalTheme } from '../models/theme.model';
import themeConfig from '../../config/theme.config.json';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSubject = new BehaviorSubject<ThemeConfig>(themeConfig as ThemeConfig);
  public theme$: Observable<ThemeConfig> = this.themeSubject.asObservable();
  
  // Almacena la metadata de la API
  private apiMetadata: Partial<ThemeConfig> | null = null;

  constructor() {
    this.applyGlobalCSSVariables();
  }

  /**
   * Carga la metadata del tema desde la API
   */
  loadFromAPIMetadata(metadata: Record<string, any> | undefined): void {
    if (!metadata) {
      console.warn('⚠️ No theme metadata found in API response');
      return;
    }

    this.apiMetadata = metadata as Partial<ThemeConfig>;
    const currentTheme = themeConfig as ThemeConfig;
    const mergedTheme = this.deepMerge(currentTheme, metadata);
    this.themeSubject.next(mergedTheme as ThemeConfig);
    this.applyGlobalCSSVariables();
    
    console.log('🎨 Theme metadata loaded from API:', Object.keys(metadata));
  }

  getTheme(): ThemeConfig {
    return this.themeSubject.getValue();
  }

  getGlobal(): GlobalTheme {
    return this.getTheme().global;
  }

  getWelcome(): WelcomeTheme {
    return this.getTheme().welcome;
  }

  getHome(): HomeTheme {
    return this.getTheme().home;
  }

  getProductModal(): ProductModalTheme {
    return this.getTheme().productModal;
  }

  getCartFloating(): CartFloatingTheme {
    return this.getTheme().cartFloating;
  }

  getCheckout(): CheckoutTheme {
    return this.getTheme().checkout;
  }

  getPayment(): PaymentTheme {
    return this.getTheme().payment;
  }

  getConfirmModal(): ConfirmModalTheme {
    return this.getTheme().confirmModal;
  }

  /**
   * Obtiene un valor específico del tema usando dot notation
   * Ejemplo: getValue('home.header.background', '#fff')
   */
  getValue<T>(path: string, defaultValue: T): T {
    const keys = path.split('.');
    let value: any = this.getTheme();
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }
    
    return (value as T) ?? defaultValue;
  }

  updateTheme(newTheme: Partial<ThemeConfig>): void {
    const currentTheme = this.getTheme();
    const updatedTheme = this.deepMerge(currentTheme, newTheme);
    this.themeSubject.next(updatedTheme as ThemeConfig);
    this.applyGlobalCSSVariables();
  }

  private applyGlobalCSSVariables(): void {
    const theme = this.getTheme();
    const root = document.documentElement;

    // Apply global colors as CSS variables
    root.style.setProperty('--primary-color', theme.global.colors.primary);
    root.style.setProperty('--secondary-color', theme.global.colors.secondary);
    root.style.setProperty('--accent-color', theme.global.colors.accent);
    root.style.setProperty('--light-color', theme.global.colors.light);
    root.style.setProperty('--white-color', theme.global.colors.white);
    root.style.setProperty('--dark-color', theme.global.colors.dark);
    
    // Gray colors
    root.style.setProperty('--gray-light', theme.global.colors.gray.light);
    root.style.setProperty('--gray-medium', theme.global.colors.gray.medium);
    root.style.setProperty('--gray-dark', theme.global.colors.gray.dark);
    
    // Status colors
    root.style.setProperty('--success-color', theme.global.colors.status.success);
    root.style.setProperty('--error-color', theme.global.colors.status.error);
    root.style.setProperty('--warning-color', theme.global.colors.status.warning);
    
    // Font family
    root.style.setProperty('--font-family', theme.global.fonts.family);
    
    // Font sizes
    root.style.setProperty('--font-size-xs', theme.global.fonts.sizes.xs);
    root.style.setProperty('--font-size-sm', theme.global.fonts.sizes.sm);
    root.style.setProperty('--font-size-md', theme.global.fonts.sizes.md);
    root.style.setProperty('--font-size-lg', theme.global.fonts.sizes.lg);
    root.style.setProperty('--font-size-xl', theme.global.fonts.sizes.xl);
    root.style.setProperty('--font-size-xxl', theme.global.fonts.sizes.xxl);
    root.style.setProperty('--font-size-xxxl', theme.global.fonts.sizes.xxxl);
    
    // Border radius
    root.style.setProperty('--border-radius-sm', theme.global.borderRadius.sm);
    root.style.setProperty('--border-radius-md', theme.global.borderRadius.md);
    root.style.setProperty('--border-radius-lg', theme.global.borderRadius.lg);
    root.style.setProperty('--border-radius-xl', theme.global.borderRadius.xl);
    root.style.setProperty('--border-radius-round', theme.global.borderRadius.round);
    root.style.setProperty('--border-radius-pill', theme.global.borderRadius.pill);
    
    // Shadows
    root.style.setProperty('--shadow-sm', theme.global.shadows.sm);
    root.style.setProperty('--shadow-md', theme.global.shadows.md);
    root.style.setProperty('--shadow-lg', theme.global.shadows.lg);
    root.style.setProperty('--shadow-xl', theme.global.shadows.xl);
  }

  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}
