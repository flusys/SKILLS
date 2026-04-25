import { Injectable } from '@angular/core';
import { ISearchAdapter, ISearchSuggestion } from '@flusys/ng-layout';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class SearchAdapterService implements ISearchAdapter {
  private readonly dummyData: ISearchSuggestion[] = [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      routerLink: ['/dashboard'],
    },
    {
      label: 'Users Management',
      icon: 'pi pi-users',
      routerLink: ['/users'],
    },
    {
      label: 'Roles & Permissions',
      icon: 'pi pi-shield',
      routerLink: ['/iam/roles'],
    },
    {
      label: 'File Manager',
      icon: 'pi pi-folder',
      routerLink: ['/storage'],
    },
    {
      label: 'Email Templates',
      icon: 'pi pi-envelope',
      routerLink: ['/email'],
    },
    {
      label: 'Events & Calendar',
      icon: 'pi pi-calendar',
      routerLink: ['/event-manager'],
    },
    {
      label: 'Form Builder',
      icon: 'pi pi-check-square',
      routerLink: ['/form-builder'],
    },
    {
      label: 'Notifications',
      icon: 'pi pi-bell',
      routerLink: ['/notifications'],
    },
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      routerLink: ['/settings'],
    },
    {
      label: 'Profile',
      icon: 'pi pi-user',
      routerLink: ['/profile'],
    },
    {
      label: 'Company Info',
      icon: 'pi pi-building',
      routerLink: ['/company'],
    },
    {
      label: 'Branches',
      icon: 'pi pi-sitemap',
      routerLink: ['/branches'],
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
    console.log('Search executed for query:', query);
  }
}
