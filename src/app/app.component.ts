import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminDialogComponent } from './components/admin-dialog/admin-dialog.component';
import { ScreenOrientationComponent } from './components/screen-orientation/screen-orientation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AdminDialogComponent, ScreenOrientationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'totem';
}
