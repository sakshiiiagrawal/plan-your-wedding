import { registerProvider } from './provider';
import { whatsappProvider } from './whatsapp/provider';

// Channel roster — add future providers (sms, email, …) here.
registerProvider(whatsappProvider);

export * from './communications.service';
