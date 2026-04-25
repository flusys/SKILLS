import {  Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LibAppConfigComponent } from '@flusys/ng-core';
import { AuthLayoutSyncService } from './services/auth-layout-sync.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LibAppConfigComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  // Initialize bridge service on app startup
  private readonly authLayoutSync = inject(AuthLayoutSyncService);
}
