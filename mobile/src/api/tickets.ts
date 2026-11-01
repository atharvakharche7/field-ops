import { Page, TicketFilters, TicketSummary } from '../types';
import { api } from './client';

// The API's largest page size. There's no "load more" yet, so a list shows at most this many.
const LIST_SIZE = 100;

export const getTickets = async (filters: TicketFilters): Promise<Page<TicketSummary>> => {
  const { data } = await api.get<Page<TicketSummary>>('/api/tickets', {
    params: { ...filters, size: LIST_SIZE },
  });
  return data;
};
