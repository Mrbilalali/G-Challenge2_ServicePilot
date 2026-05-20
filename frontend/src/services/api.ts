const API_BASE = "http://localhost:8000/api";

export async function fetchProviders() {
  const res = await fetch(`${API_BASE}/providers`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  const provs = data.providers;
  if (provs && typeof provs === 'object' && !Array.isArray(provs)) {
    return [...(provs.internal || []), ...(provs.external || [])];
  }
  return provs || [];
}

export async function fetchBookings() {
  const res = await fetch(`${API_BASE}/bookings`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return data.bookings || [];
}

export async function fetchTrace(bookingId: string) {
  const res = await fetch(`${API_BASE}/trace/${bookingId}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.trace;
}
