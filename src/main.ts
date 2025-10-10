// import { bootstrapApplication } from '@angular/platform-browser';
// import { appConfig } from './app/app.config';
// import { App } from './app/app';

// bootstrapApplication(App, appConfig)
//   .catch((err) => console.error(err));


import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';  // Add this
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { Routes } from '@angular/router';
import { FileUpload } from './app/file-upload/file-upload';
import { LoginComponent } from './app/login/login';

export const routes: Routes = [
  { path: 'upload', component: FileUpload },
  { path: '', redirectTo: '/upload', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
];

bootstrapApplication(App, {
  providers: [
    provideHttpClient(),
    provideRouter(routes),          // Add router providers
    ...(appConfig.providers ?? [])
  ]
})
  .catch((err) => console.error(err));

