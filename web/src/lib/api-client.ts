import { apiRequest as request } from '@/lib/api'

// The charity and verification screens call this with no options for reads, so GET is the default here.
export function apiRequest<T = unknown>(path: string, options: Parameters<typeof request>[1] = {}): Promise<T> {
  return request<T>(path, { method: 'GET', ...options })
}
