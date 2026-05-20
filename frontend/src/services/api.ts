const API_BASE = "http://127.0.0.1:8000/api";

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

export async function fetchPosts() {
  try {
    const res = await fetch(`${API_BASE}/posts`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Backend post route failed");
    return await res.json();
  } catch (err) {
    console.warn("Falling back to direct jsonplaceholder fetch due to backend unavailability:", err);
    try {
      const res = await fetch("https://jsonplaceholder.typicode.com/posts");
      if (res.ok) {
        const posts = await res.json();
        return posts.slice(0, 30);
      }
    } catch (e) {
      console.error("Direct JSONPlaceholder fetch also failed:", e);
    }
    // Deep fallback with beautiful localized blog posts
    return [
      {
        userId: 1,
        id: 1,
        title: "⚡ Pro Maintenance: Preparing Your Home for Summer Heatwaves",
        body: "Ensure your AC units are serviced and electrical wiring is inspected. Overloaded circuits are the leading cause of short circuits during the hot summer months in DHA Lahore."
      },
      {
        userId: 1,
        id: 2,
        title: "💧 Safe Plumbing: Fixing Water Pipe Corrosion Before It Causes Damage",
        body: "Corroded pipes can result in sudden pressure drops and expensive structural damage. Call a certified Lahore plumber for a comprehensive annual checkup."
      },
      {
        userId: 2,
        id: 12,
        title: "🚨 Emergency Safety: Quick Action on Electrical Gas Sparking",
        body: "If you notice sparking or burning smells from electrical sockets, switch off your main breaker immediately. Do not attempt to repair it yourself; use our safe operations portal to book an emergency electrician."
      },
      {
        userId: 3,
        id: 23,
        title: "💡 Service Hacks: Optimizing Your AC General Wash Frequency",
        body: "A simple AC filter wash every two weeks can reduce cooling energy bills by up to 15%. A full chemical general service is only needed twice a year."
      },
      {
        userId: 4,
        id: 35,
        title: "📢 Platform News: ServicePilot Safe Escrow Shield Launched!",
        body: "We have launched our automated escrow protection shield. All customer payments are now held securely in escrow and only released to the service provider once the job is fully completed to the user's satisfaction."
      }
    ];
  }
}

