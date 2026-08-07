import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-coming-soon',
  templateUrl: './coming-soon.html',
  styleUrl: './coming-soon.scss',
})
export class ComingSoon {
  private readonly route = inject(ActivatedRoute);

  protected readonly title = toSignal(this.route.data.pipe(map((data) => (data['title'] as string) ?? 'Settings')), {
    initialValue: '',
  });
}
