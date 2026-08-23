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
import { FeatureFlagsService } from './core/services/feature-flags.service';
import { MapSettingsService } from './core/services/map-settings.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideRouter(routes),
    provideMapProvider(),
    // Silently restores a session from the stored refresh token before routes/guards evaluate,
    // so a page reload doesn't bounce an already-logged-in user through the login screen.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).tryRestoreSession())),
    // Warms MapSettingsService's Google Maps API key cache before anything injects MAP_PROVIDER
    // (that factory reads getApiKey() synchronously) — see MapSettingsService.prefetchApiKey().
    provideAppInitializer(() => inject(MapSettingsService).prefetchApiKey()),
    // Loads the feature-flag catalog before routes render, so the very first paint already knows
    // whether to show dark mode/clustering/Google SSO — see FeatureFlagsService.
    provideAppInitializer(() => firstValueFrom(inject(FeatureFlagsService).refresh())),
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
