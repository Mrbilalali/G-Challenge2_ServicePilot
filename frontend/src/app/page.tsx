import { fetchProviders, fetchBookings } from "@/services/api";
import Link from "next/link";

export default async function DashboardHome() {
  const providers = await fetchProviders();
  const bookings = await fetchBookings();

  const totalBookings = bookings.length;
  const completed = bookings.filter((b: any) => b.status === "completed").length;
  const recovered = bookings.filter((b: any) => b.status === "recovered").length;
  const totalRevenue = bookings
    .filter((b: any) => b.status === "completed" || b.status === "confirmed")
    .reduce((sum: number, b: any) => sum + (b.pricing?.total || 0), 0);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#eef2ff] to-[#f8fafc]">
      <div className="neural-bg"></div>
      
      <div className="max-w-7xl mx-auto p-8 relative z-10">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="status-dot active animate-pulse-slow"></span>
              <span className="text-xs font-bold text-green-400 tracking-widest uppercase">System Online</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-3">
              <span className="text-primary animate-float">⬢</span> 
              <span className="text-gray-900">ServicePilot</span>
              <span className="neon-text">AI</span>
            </h1>
            <p className="text-gray-400 mt-3 font-medium text-lg max-w-xl">
              Autonomous service operations orchestrator for the informal economy.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="glass-panel px-6 py-4 rounded-2xl flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500 font-bold uppercase">Active Fleet</p>
                <p className="text-xl font-black text-gray-900">{providers.length} Providers</p>
              </div>
              <div className="h-10 w-px bg-border"></div>
              <div className="text-left">
                <p className="text-xs text-gray-500 font-bold uppercase">Success Rate</p>
                <p className="text-xl font-black text-green-400">98.5%</p>
              </div>
            </div>
            <Link href="/baseline" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl text-center text-sm shadow-md transition-colors flex items-center justify-center gap-2">
              <span className="text-xl">⚖</span> View Baseline Comparison
            </Link>
          </div>
        </header>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-indigo-50/80 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden border border-indigo-200 shadow-sm hover:shadow-md transition-all group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-100 rounded-full blur-xl group-hover:bg-indigo-200 transition-all"></div>
            <h3 className="text-xs font-bold text-indigo-500 mb-2 uppercase tracking-wider">Total Orchestrations</h3>
            <p className="text-5xl font-black text-indigo-900 mb-2">{totalBookings}</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-indigo-600 font-bold flex items-center">↑ 12%</span>
              <span className="text-indigo-400">vs last week</span>
            </div>
          </div>

          <div className="bg-blue-50/80 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden border border-blue-200 shadow-sm hover:shadow-md transition-all group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-100 rounded-full blur-xl group-hover:bg-blue-200 transition-all"></div>
            <h3 className="text-xs font-bold text-blue-500 mb-2 uppercase tracking-wider">Completed Services</h3>
            <p className="text-5xl font-black text-blue-700 mb-2">{completed}</p>
            <div className="w-full bg-blue-100 h-1.5 rounded-full mt-4">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(completed/Math.max(1, totalBookings))*100}%` }}></div>
            </div>
          </div>

          <div className="bg-amber-50/80 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden border border-amber-200 shadow-sm hover:shadow-md transition-all group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-100 rounded-full blur-xl group-hover:bg-amber-200 transition-all"></div>
            <h3 className="text-xs font-bold text-amber-600 mb-2 uppercase tracking-wider">Auto-Recoveries</h3>
            <p className="text-5xl font-black text-amber-500 mb-2">{recovered}</p>
            <p className="text-xs text-amber-700/70 mt-3 leading-relaxed">
              Instances where the AI autonomously re-booked a cancelled provider.
            </p>
          </div>

          <div className="bg-emerald-50/80 backdrop-blur-md rounded-2xl p-6 relative overflow-hidden border border-emerald-200 shadow-sm hover:shadow-md transition-all group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-100 rounded-full blur-xl group-hover:bg-emerald-200 transition-all"></div>
            <h3 className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wider">Total Revenue</h3>
            <p className="text-4xl font-black text-emerald-600 mb-2">Rs.{totalRevenue}</p>
            <div className="flex items-center gap-2 mt-4 opacity-70">
              <div className="h-4 w-1 bg-emerald-400 rounded-sm"></div>
              <div className="h-6 w-1 bg-emerald-400 rounded-sm"></div>
              <div className="h-5 w-1 bg-emerald-400 rounded-sm"></div>
              <div className="h-8 w-1 bg-emerald-400 rounded-sm"></div>
              <div className="h-7 w-1 bg-emerald-400 rounded-sm"></div>
              <div className="h-10 w-1 bg-emerald-400 rounded-sm"></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Recent Bookings (7 cols) */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-primary">⚡</span> Live Orchestration Stream
              </h2>
            </div>
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="glass-panel rounded-2xl p-10 text-center">
                  <p className="text-gray-500">No orchestrations active. Submit a request from the mobile app.</p>
                </div>
              ) : bookings.slice(0, 6).map((b: any) => (
                <div key={b.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-5 hover:bg-white transition-colors group relative overflow-hidden shadow-sm border border-gray-200">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded text-xs font-black uppercase tracking-wider ${
                        b.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        b.status === 'recovered' ? 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse' :
                        b.status === 'completed' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        'bg-rose-100 text-rose-700 border border-rose-200'
                      }`}>
                        {b.status === 'recovered' && '⟲ '}
                        {b.status}
                      </span>
                      <span className="text-xs text-gray-500 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">ID: {b.id}</span>
                    </div>
                    <Link href={`/trace/${b.id}`} className="text-xs text-indigo-600 font-bold hover:text-indigo-800 transition-colors flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                      View AI Trace <span>→</span>
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{b.provider?.name}</h4>
                      <p className="text-sm text-gray-600 italic mt-1 line-clamp-1 border-l-2 border-indigo-200 pl-2">"{b.user_message}"</p>
                    </div>
                    <div className="flex md:justify-end gap-6">
                      <div className="text-left">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Schedule</p>
                        <p className="text-sm font-semibold text-gray-800">{b.schedule?.date}</p>
                        <p className="text-xs text-gray-500">{b.schedule?.time_start}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Pricing</p>
                        <p className="text-sm font-black text-emerald-600">Rs.{b.pricing?.total}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Provider Fleet Heatmap (5 cols) */}
          <div className="lg:col-span-5">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
              <span className="text-primary">📍</span> Active Provider Fleet
            </h2>
            
            {/* Visual Heatmap Placeholder */}
            <div className="bg-slate-800 rounded-2xl p-1 mb-6 relative h-48 overflow-hidden group shadow-lg border border-slate-700">
              <div className="absolute inset-0 bg-[#0f172a] opacity-90 z-0"></div>
              {/* Simulated Map Grid */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0 mix-blend-screen"></div>
              
              <div className="relative z-10 w-full h-full p-4">
                {/* Active Dots */}
                <div className="absolute top-[30%] left-[40%] animate-pulse"><div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_15px_#10b981]"></div></div>
                <div className="absolute top-[60%] left-[20%] animate-pulse" style={{animationDelay: "1s"}}><div className="w-3 h-3 bg-primary rounded-full shadow-[0_0_15px_#8b5cf6]"></div></div>
                <div className="absolute top-[45%] left-[70%] animate-pulse" style={{animationDelay: "0.5s"}}><div className="w-3 h-3 bg-yellow-500 rounded-full shadow-[0_0_15px_#f59e0b]"></div></div>
                <div className="absolute top-[75%] left-[60%] animate-pulse" style={{animationDelay: "1.5s"}}><div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_15px_#10b981]"></div></div>
                <div className="absolute top-[20%] left-[80%] animate-pulse" style={{animationDelay: "0.2s"}}><div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_#3b82f6]"></div></div>
                
                <div className="absolute bottom-4 left-4 bg-white/60 backdrop-blur-md border border-white/50 p-2 rounded-lg text-xs font-mono shadow-sm">
                  <p className="text-green-400">● Available</p>
                  <p className="text-primary mt-1">● Busy</p>
                  <p className="text-yellow-500 mt-1">● Recovering</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {providers.slice(0, 5).map((p: any) => (
                <div key={p.id} className="bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 border border-indigo-200">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{p.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {p.area}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-amber-500 font-black text-sm">⭐ {p.rating.toFixed(1)}</div>
                    <div className="text-[10px] text-gray-400 mt-1 font-bold">{(p.reliability_score * 100).toFixed(0)}% REL</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full py-3 mt-4 glass-panel hover:bg-gray-50 text-sm font-bold text-gray-700 transition-colors rounded-xl border border-border">
              View Entire Fleet Directory
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
