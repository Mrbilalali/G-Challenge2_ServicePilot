import Link from "next/link";

export default function BaselineCompare() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#f8fafc] to-[#eef2ff]">
      <div className="neural-bg"></div>
      
      <div className="max-w-7xl mx-auto p-8 relative z-10 pb-20">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-200 pb-6">
          <div>
            <Link href="/" className="text-sm font-bold text-indigo-600 mb-4 inline-block hover:text-indigo-800">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-3 text-gray-900">
              Baseline Comparison
            </h1>
            <p className="text-gray-600 mt-3 font-medium text-lg max-w-2xl">
              A side-by-side demonstration of a standard heuristic booking system versus the ServicePilot AI Agentic System handling a critical failure scenario.
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-xl">⚠</div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Stress Test Scenario</p>
              <p className="text-sm font-black text-gray-900">Last-Minute Provider Cancellation</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Baseline System */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 border-t-8 border-t-gray-400 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-500 text-2xl font-black">1.0</div>
              <div>
                <h2 className="text-2xl font-black text-gray-900">Traditional App</h2>
                <p className="text-sm text-gray-500 font-bold">Standard Heuristic Logic</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">1</div>
                  <div className="w-px h-full bg-gray-200 my-2"></div>
                </div>
                <div className="flex-1 pb-6">
                  <h4 className="font-bold text-gray-800 text-lg">User Booking Confirmed</h4>
                  <p className="text-sm text-gray-600 mt-1">User books an AC Repair technician for 10:00 AM.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-xs font-bold text-rose-600">2</div>
                  <div className="w-px h-full bg-gray-200 my-2"></div>
                </div>
                <div className="flex-1 pb-6">
                  <h4 className="font-bold text-rose-600 text-lg">Provider Cancels</h4>
                  <p className="text-sm text-gray-600 mt-1">At 9:30 AM, the provider hits "Cancel Job" due to an emergency.</p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-3">
                    <code className="text-xs text-rose-500 font-mono">UPDATE bookings SET status='cancelled' WHERE id=123;</code>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">3</div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 text-lg">System Response</h4>
                  <p className="text-sm text-gray-600 mt-1">System sends an automated push notification to the user.</p>
                  
                  {/* Mock Phone UI */}
                  <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm max-w-sm">
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-500">9:31 AM</span>
                      <span className="text-[10px] font-bold text-gray-500">Lock Screen</span>
                    </div>
                    <div className="p-4">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-gray-300 rounded"></div>
                          <span className="text-xs font-bold text-gray-700">Booking App</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">Booking Cancelled</p>
                        <p className="text-xs text-gray-600 mt-1">Sorry, your provider cancelled the job. Please open the app to search for and book a new provider.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg">
                    <h5 className="text-rose-700 font-bold text-sm">Outcome: Failure</h5>
                    <p className="text-rose-600 text-xs mt-1">User is left stranded 30 minutes before the job, frustrated, and has to manually start the process again.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Agentic System */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-8 border-t-8 border-t-indigo-500 border border-indigo-100 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
            
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center border border-indigo-200 text-indigo-600 text-2xl font-black">2.0</div>
              <div>
                <h2 className="text-2xl font-black text-indigo-900 flex items-center gap-2">
                  ServicePilot <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">AI</span>
                </h2>
                <p className="text-sm text-indigo-500 font-bold">Autonomous Agentic Orchestrator</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 border border-indigo-200">1</div>
                  <div className="w-px h-full bg-indigo-200 my-2"></div>
                </div>
                <div className="flex-1 pb-6">
                  <h4 className="font-bold text-gray-800 text-lg">User Booking Confirmed</h4>
                  <p className="text-sm text-gray-600 mt-1">User books an AC Repair technician for 10:00 AM.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-xs font-bold text-rose-600">2</div>
                  <div className="w-px h-full bg-indigo-200 my-2"></div>
                </div>
                <div className="flex-1 pb-6">
                  <h4 className="font-bold text-rose-600 text-lg">Provider Cancels</h4>
                  <p className="text-sm text-gray-600 mt-1">At 9:30 AM, the provider cancels. The event is intercepted by the orchestrator.</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-xs font-bold text-amber-600">3</div>
                  <div className="w-px h-full bg-indigo-200 my-2"></div>
                </div>
                <div className="flex-1 pb-6">
                  <h4 className="font-bold text-amber-700 text-lg">Recovery Agent Triggered</h4>
                  <p className="text-sm text-gray-600 mt-1">The AI does not alert the user yet. It instantly spawns a <span className="font-bold text-indigo-600">MatchingAgent</span> to find the next best provider.</p>
                  
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mt-3 shadow-inner">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">AI Trace</span>
                    </div>
                    <code className="text-[11px] text-gray-600 font-mono block">
                      <span className="text-indigo-500">➔</span> Analyzing backup providers...<br/>
                      <span className="text-emerald-500">✓</span> Provider "Asif Ali" found available.<br/>
                      <span className="text-indigo-500">➔</span> Checking 6+ factors (Reliability, Distance...)<br/>
                      <span className="text-emerald-500">✓</span> Match verified. Re-allocating job dynamically.
                    </code>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-600">4</div>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800 text-lg">System Response</h4>
                  <p className="text-sm text-gray-600 mt-1">System seamlessly rebooks and updates the user positively.</p>
                  
                  {/* Mock Phone UI */}
                  <div className="mt-4 border border-indigo-200 rounded-xl overflow-hidden bg-white shadow-md max-w-sm">
                    <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-indigo-400">9:31 AM</span>
                      <span className="text-[10px] font-bold text-indigo-400">Lock Screen</span>
                    </div>
                    <div className="p-4">
                      <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-indigo-500 rounded flex items-center justify-center">
                            <span className="text-white text-[8px]">⬢</span>
                          </div>
                          <span className="text-xs font-bold text-indigo-700">ServicePilot</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900">Provider Re-Assigned ⚡</p>
                        <p className="text-xs text-gray-600 mt-1">Your original provider had an emergency, but our AI instantly rebooked "Asif Ali" for you. Same price, same 10:00 AM slot. See you soon!</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
                    <h5 className="text-emerald-700 font-bold text-sm">Outcome: Total Success</h5>
                    <p className="text-emerald-600 text-xs mt-1">Zero user frustration. The AI autonomously handled the dispute/cancellation, maintaining trust and retaining the revenue.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
