import { Injectable } from "@angular/core";
import { ISearchAdapter, ISearchSuggestion } from "@flusys/ng-layout";
import { Observable, of } from "rxjs";
import { delay, map } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class SearchAdapterService implements ISearchAdapter {
  private readonly dummyData: ISearchSuggestion[] = [
    {
      label: "Dashboard",
      icon: "home",
      routerLink: ["/"],
    },
    {
      label: "Users Management",
      icon: "users",
      routerLink: ["/users"],
    },
    {
      label: "Roles & Permissions",
      icon: "shield",
      routerLink: ["/iam/roles"],
    },
    {
      label: "File Manager",
      icon: "folder",
      routerLink: ["/storage"],
    },
    {
      label: "Email Templates",
      icon: "envelope",
      routerLink: ["/email"],
    },
    {
      label: "Events & Calendar",
      icon: "calendar",
      routerLink: ["/event-manager"],
    },
    {
      label: "Form Builder",
      icon: "check-square",
      routerLink: ["/form-builder"],
    },
    {
      label: "Notifications",
      icon: "bell",
      routerLink: ["/notifications"],
    },
    {
      label: "Settings",
      icon: "cog",
      routerLink: ["/settings"],
    },
    {
      label: "Profile",
      icon: "user",
      routerLink: ["/profile"],
    },
    {
      label: "Company Info",
      icon: "building",
      routerLink: ["/company"],
    },
    {
      label: "Branches",
      icon: "sitemap",
      routerLink: ["/branches"],
    },
  ];

  getSuggestions(query: string): Observable<ISearchSuggestion[]> {
    const lowerQuery = query.toLowerCase();

    return of(this.dummyData).pipe(
      // Simulate API delay
      delay(150),
      // Filter by query
      map((items) =>
        items.filter((item) => item.label.toLowerCase().includes(lowerQuery)),
      ),
    );
  }
  onSearch(query: string): void {
    console.log("Search executed for query:", query);
  }
}
