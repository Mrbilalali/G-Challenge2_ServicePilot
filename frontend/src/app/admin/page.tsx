import { fetchBookings, fetchProviders } from "@/services/api";
import Link from "next/link";

export default async function AdminDashboard() {
  const bookings = await fetchBookings();
  const providers = await fetchProviders();

  // Metrics calculations
  const totalBookings = bookings.length;
  const confirmedCount = bookings.filter((b: any) => b.status === "confirmed").length;
  const completedCount = bookings.filter((b: any) => b.status === "completed").length;
  const recoveredCount = bookings.filter((b: any) => b.status === "recovered").length;

  const totalEscrowLocked = bookings
    .filter((b: any) => b.status === "confirmed" || b.status === "recovered")
    .reduce((sum: number, b: any) => sum + (b.pricing?.total || 1200), 0);

  const totalEscrowPayouts = bookings
    .filter((b: any) => b.status === "completed")
    .reduce((sum: number, b: any) => sum + (b.pricing?.total || 1200), 0);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#eef2ff] to-[#f8fafc]">
      <div className="neural-bg"></div>
      
      <div className="max-w-7xl mx-auto p-8 relative z-10">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="status-dot active animate-pulse-slow"></span>
              <span className="text-xs font-bold text-indigo-600 tracking-widest uppercase">Admin Ops Center</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-3">
              <span className="text-primary animate-float">🛡️</span> 
              <span className="text-gray-900">ServicePilot</span>
              <span className="neon-text">Operations</span>
            </h1>
            <p className="text-gray-400 mt-3 font-medium text-lg max-w-xl">
              Escrow custody, AI traces, role-based verifications, and disputes handling.
            </p>
          </div>
          <div className="flex gap-4">
            <Link href="/" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl text-center text-sm shadow-md transition-colors">
              ← Return Home
            </Link>
          </div>
        </header>

        {/* Ops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-indigo-100 shadow-sm">
            <h3 className="text-xs font-bold text-indigo-500 mb-2 uppercase tracking-wider">Custody Escrow Locked</h3>
            <p className="text-4xl font-black text-indigo-900 mb-2">Rs. {totalEscrowLocked}</p>
            <span className="text-xs text-gray-500 font-bold uppercase">🔐 Safe Lock active</span>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-emerald-100 shadow-sm">
            <h3 className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wider">Escrow Released</h3>
            <p className="text-4xl font-black text-emerald-600 mb-2">Rs. {totalEscrowPayouts}</p>
            <span className="text-xs text-green-500 font-bold uppercase">✓ Released to providers</span>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-amber-100 shadow-sm">
            <h3 className="text-xs font-bold text-amber-600 mb-2 uppercase tracking-wider">Active Recovery Loops</h3>
            <p className="text-4xl font-black text-amber-600 mb-2">{recoveredCount}</p>
            <span className="text-xs text-amber-500 font-bold uppercase">⚡ Auto-healing active</span>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-purple-100 shadow-sm">
            <h3 className="text-xs font-bold text-purple-600 mb-2 uppercase tracking-wider">Total Fleet Verified</h3>
            <p className="text-4xl font-black text-purple-600 mb-2">{providers.filter((p: any) => p.is_verified).length}</p>
            <span className="text-xs text-purple-500 font-bold uppercase">🛡️ CNIC + Selfie Checked</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Booking & Escrow Status (7 cols) */}
          <div className="lg:col-span-7">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
              <span>📅</span> Escrow Booking Log
            </h2>
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="glass-panel rounded-2xl p-10 text-center">
                  <p className="text-gray-500">No active bookings under administrative custody.</p>
                </div>
              ) : bookings.map((b: any) => (
                <div key={b.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs text-gray-400 font-mono">ID: {b.id}</span>
                      <h4 className="font-bold text-gray-900 text-lg">{b.provider?.name || "Unassigned Specialist"}</h4>
                      <p className="text-xs text-gray-500">{b.service_type} near {b.location}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider ${
                      b.status === 'confirmed' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      b.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <span className="text-xs font-bold text-indigo-600">Custody: Rs. {b.pricing?.total || 1200}</span>
                    <Link href={`/trace/${b.id}`} className="text-xs text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
                      Inspect Trace Logs →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Provider Verification & Trust Score (5 cols) */}
          <div className="lg:col-span-5">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
              <span>🛡️</span> Provider Compliance & Trust Scores
            </h2>
            <div className="space-y-4">
              {providers.map((p: any) => (
                <div key={p.id} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-gray-900 text-sm">{p.name}</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      p.is_verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.is_verified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Trust Score:</span>
                      <span className="font-bold text-indigo-600">
                        {Math.round((p.reliability_score || p.trust_score || 80) > 1 ? (p.reliability_score || p.trust_score || 80) : ((p.reliability_score || p.trust_score || 0.8) * 100))} / 100
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ width: `${Math.round((p.reliability_score || p.trust_score || 80) > 1 ? (p.reliability_score || p.trust_score || 80) : ((p.reliability_score || p.trust_score || 0.8) * 100))}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>On-Time Score: {Math.round((p.on_time_score || 0.8) > 1 ? (p.on_time_score || 80) : ((p.on_time_score || 0.8) * 100))}%</span>
                      <span>Cancellation Rate: {Math.round((p.cancellation_rate || 0.05) > 1 ? (p.cancellation_rate || 5) : ((p.cancellation_rate || 0.05) * 100))}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
