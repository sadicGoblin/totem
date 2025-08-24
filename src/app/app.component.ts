import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminDialogComponent } from './components/admin-dialog/admin-dialog.component';
import { ScreenOrientationComponent } from './components/screen-orientation/screen-orientation.component';
import { IdleService } from './services/idle.service';
import { UrlParamsService } from './services/url-params.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AdminDialogComponent, ScreenOrientationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'totem';
  constructor(
    private idleService: IdleService,
    private urlParamsService: UrlParamsService
  ) {
    this.idleService.startWatching();
    // El servicio UrlParamsService se inicializa automáticamente
  }

}
