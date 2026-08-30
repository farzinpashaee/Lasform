import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-coming-soon',
  imports: [TranslocoPipe],
  templateUrl: './coming-soon.html',
  styleUrl: './coming-soon.scss',
})
export class ComingSoon {
  private readonly route = inject(ActivatedRoute);

  protected readonly titleKey = toSignal(
    this.route.data.pipe(map((data) => (data['titleKey'] as string) ?? 'common.settings')),
    { initialValue: '' },
  );
}
