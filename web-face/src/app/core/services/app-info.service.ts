import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';

/** The subset of Spring Boot Actuator's raw /actuator/info shape this app reads. Every field is
 *  optional because it depends entirely on build-info.properties/git.properties having been
 *  generated at build time (see core/pom.xml) — both are absent, for example, from an IDE "run"
 *  that skips the Maven package phase. */
interface RawActuatorInfo {
  build?: { version?: string };
  git?: { commit?: { id?: { full?: string; abbrev?: string } } };
}

export interface AppInfo {
  version: string | null;
  commitId: string | null;
  commitIdAbbrev: string | null;
}

/** Application version + git commit id, surfaced in the map page's "About" panel — see MapPage.appInfo. */
@Injectable({ providedIn: 'root' })
export class AppInfoService {
  private readonly http = inject(HttpClient);

  get(): Observable<AppInfo> {
    return this.http.get<RawActuatorInfo>(`${environment.actuatorUrl}/info`).pipe(
      map((raw) => ({
        version: raw.build?.version ?? null,
        commitId: raw.git?.commit?.id?.full ?? null,
        commitIdAbbrev: raw.git?.commit?.id?.abbrev ?? null,
      })),
    );
  }
}
