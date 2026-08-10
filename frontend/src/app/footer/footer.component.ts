import { Component, inject } from '@angular/core';
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

  protected openContactForm(): void {
    this.contactService.open('contact');
  }
}
