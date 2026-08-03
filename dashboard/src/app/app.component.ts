import { Component, inject } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { ChatWidgetHostComponent } from "@flusys/ng-ai-assistant";
import { LibAppConfigComponent } from "@flusys/ng-core";
import { AppUpdateService } from "./services/app-update.service";
import { AuthLayoutSyncService } from "./services/auth-layout-sync.service";

@Component({
  selector: "app-root",
  imports: [RouterOutlet, LibAppConfigComponent, ChatWidgetHostComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  private readonly authLayoutSync = inject(AuthLayoutSyncService);
  // Instantiated for its side effect: watches for and surfaces SW updates.
  private readonly appUpdate = inject(AppUpdateService);
}
