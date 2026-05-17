import { Platform } from 'react-native';

// Auto-resolve API base based on the platform the app is running on.
export const API_BASE = Platform.select({
  web: "http://localhost:8000/api",
  android: "http://172.17.100.187:8000/api",
  default: "http://172.17.100.187:8000/api"
});

export async function submitRequest(
  message: string,
  bookingStep?: number,
  selectedTechName?: string,
  selectedTechRate?: number,
  selectedTimeSlot?: string
) {
  const res = await fetch(`${API_BASE}/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      booking_step: bookingStep,
      selected_tech_name: selectedTechName,
      selected_tech_rate: selectedTechRate,
      selected_time_slot: selectedTimeSlot
    }),
  });
  return res.json();
}

export async function getBookings() {
  const res = await fetch(`${API_BASE}/bookings`);
  return res.json();
}

export async function getBooking(id: string) {
  const res = await fetch(`${API_BASE}/booking/${id}`);
  return res.json();
}

export async function cancelBooking(id: string) {
  const res = await fetch(`${API_BASE}/cancel/${id}`, { method: "POST" });
  return res.json();
}

export async function submitFeedback(id: string, rating: number, comment: string) {
  const res = await fetch(`${API_BASE}/feedback/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating, comment }),
  });
  return res.json();
}

export async function getTrace(id: string) {
  const res = await fetch(`${API_BASE}/trace/${id}`);
  return res.json();
}

export async function getProviders(location?: string) {
  const query = location ? `?location=${encodeURIComponent(location)}` : '';
  const res = await fetch(`${API_BASE}/providers${query}`);
  return res.json();
}

export async function createAdvanceBooking(data: {
  service_type: string;
  location: string;
  preferred_date: string;
  preferred_time: string;
  recurrence: string;
  notes: string;
}) {
  const res = await fetch(`${API_BASE}/advance-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// --- Escrow Payment ---
export async function createEscrow(bookingId: string, amount: number, paymentMethod: string = "wallet") {
  const res = await fetch(`${API_BASE}/escrow/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ booking_id: bookingId, amount, payment_method: paymentMethod }),
  });
  return res.json();
}

export async function releaseEscrow(bookingId: string) {
  const res = await fetch(`${API_BASE}/escrow/release/${bookingId}`, { method: "POST" });
  return res.json();
}

export async function disputeEscrow(bookingId: string) {
  const res = await fetch(`${API_BASE}/escrow/dispute/${bookingId}`, { method: "POST" });
  return res.json();
}

export async function refundEscrow(bookingId: string) {
  const res = await fetch(`${API_BASE}/escrow/refund/${bookingId}`, { method: "POST" });
  return res.json();
}

// --- Wallet ---
export async function getWallet(userType: string = "customer") {
  const res = await fetch(`${API_BASE}/wallet/${userType}`);
  return res.json();
}

// --- Chat ---
export async function sendChatMessage(bookingId: string, message: string, sender: string = "customer") {
  const res = await fetch(`${API_BASE}/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ booking_id: bookingId, sender, message, message_type: "text" }),
  });
  return res.json();
}

export async function getChatMessages(bookingId: string) {
  const res = await fetch(`${API_BASE}/chat/${bookingId}`);
  return res.json();
}

// --- Manual Booking ---
export async function createManualBooking(data: {
  id: string;
  provider_id: string;
  provider_name: string;
  service_type: string;
  amount: number;
  preferred_date: string;
  preferred_time: string;
  payment_method: string;
  notes?: string;
}) {
  const res = await fetch(`${API_BASE}/booking/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateBookingStatus(bookingId: string, status: string) {
  const res = await fetch(`${API_BASE}/booking/update/${bookingId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return res.json();
}
