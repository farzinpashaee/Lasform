import { ApplicationConfig, inject, isDevMode, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { provideMapProvider } from './core/maps';
import { TranslocoHttpLoader } from './core/i18n/transloco-loader';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideRouter(routes),
    provideMapProvider(),
    // Silently restores a session from the stored refresh token before routes/guards evaluate,
    // so a page reload doesn't bounce an already-logged-in user through the login screen.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).tryRestoreSession())),
    provideTransloco({
      config: {
        // English is the only bundle shipped today; adding a locale is just another
        // lasform/assets/i18n/{lang}.json file plus its code listed here.
        availableLangs: ['en'],
        defaultLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
