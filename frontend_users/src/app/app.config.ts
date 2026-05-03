import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

export const appConfig = {
  providers: [
    providePrimeNG({
      theme: {
        preset: Aura
      }
    })
  ]
};