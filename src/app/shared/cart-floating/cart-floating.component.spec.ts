import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CartFloatingComponent } from './cart-floating.component';

describe('CartFloatingComponent', () => {
  let component: CartFloatingComponent;
  let fixture: ComponentFixture<CartFloatingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartFloatingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CartFloatingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
