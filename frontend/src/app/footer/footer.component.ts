import { Component, inject, model } from '@angular/core';
import { ContactService } from '../services/contact.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  private readonly contactService = inject(ContactService);

  protected readonly currentYear = new Date().getFullYear();

  /**
   * Mentions détaillées repliées : passe à true dès la première interaction
   * avec la carte (cf. MapPageComponent) ; le bouton Infos/Réduire permet
   * ensuite de les rouvrir ou de les refermer.
   */
  readonly collapsed = model(false);

  protected openContactForm(): void {
    this.contactService.open('contact');
  }
}
