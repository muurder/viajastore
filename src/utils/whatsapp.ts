
import { Trip } from '../types';

export const buildWhatsAppLink = (whatsapp: string | undefined, trip: Trip): string | null => {
  if (!whatsapp) return null;
  
  const cleanNumber = whatsapp.replace(/\D/g, '');
  if (!cleanNumber) return null;

  // Detect if using HashRouter or BrowserRouter based on current location
  const isHashRouter = window.location.hash.length > 0;
  const baseUrl = window.location.origin;
  const path = `/viagem/${trip.slug || trip.id}`;
  const tripUrl = isHashRouter ? `${baseUrl}/#${path}` : `${baseUrl}${path}`;

  const message = `Olá! Vi o pacote *${trip.title}* na ViajaStore.
Destino: ${trip.destination}
Duração: ${trip.durationDays} dias
Preço: A partir de R$ ${trip.price.toLocaleString('pt-BR')}
Link: ${tripUrl}
Ref: VS-${trip.id}

Gostaria de mais informações.`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
};
