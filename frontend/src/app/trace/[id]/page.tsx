import { fetchTrace } from "@/services/api";
import Link from "next/link";

export default async function TraceViewer({ params }: { params: { id: string } }) {
  const { id } = await params;
  const traceData = await fetchTrace(id);
  
  if (!traceData) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-10">
        <div className="glass-panel p-8 rounded-2xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <span className="text-red-500 text-2xl">⚠</span>
          </div>
          <h2 className="text-gray-900 text-xl font-bold mb-2">Trace Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">The neural trace for this orchestration could not be located.</p>
          <Link href="/" className="px-6 py-2 bg-gray-900 text-white font-bold rounded-lg text-sm transition-transform hover:scale-105 active:scale-95 inline-block">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const traces = traceData.traces || [];

  const getAgentTheme = (agentName: string) => {
    if (agentName.includes('Intent')) return { bg: 'bg-indigo-50', border: 'border-indigo-500', text: 'text-indigo-700', shadow: 'shadow-indigo-500/20', line: 'bg-indigo-400' };
    if (agentName.includes('Matching')) return { bg: 'bg-amber-50', border: 'border-amber-500', text: 'text-amber-700', shadow: 'shadow-amber-500/20', line: 'bg-amber-400' };
    if (agentName.includes('Pricing')) return { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', shadow: 'shadow-emerald-500/20', line: 'bg-emerald-400' };
    if (agentName.includes('Scheduling')) return { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', shadow: 'shadow-blue-500/20', line: 'bg-blue-400' };
    if (agentName.includes('Recovery')) return { bg: 'bg-rose-50', border: 'border-rose-500', text: 'text-rose-700', shadow: 'shadow-rose-500/20', line: 'bg-rose-400' };
    return { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700', shadow: 'shadow-purple-500/20', line: 'bg-purple-400' };
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#eef2ff] to-[#f8fafc]">
      <div className="neural-bg"></div>
      
      <div className="max-w-5xl mx-auto p-8 relative z-10 pb-20">
        <header className="mb-10 flex flex-col md:flex-row md:items-center gap-4">
          <Link href="/" className="w-10 h-10 glass-panel rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-900">
            ←
          </Link>
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <span className="text-primary animate-pulse-slow">⚡</span> Neural Pipeline Trace
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-mono text-gray-600 text-xs bg-white px-2 py-1 rounded border border-border">
                Orchestration ID: {id}
              </span>
              {traceData.recovery_at && (
                <span className="font-mono text-yellow-400 text-xs bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                  Recovery Triggered
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Neural Node Graph Simulation */}
        <div className="relative space-y-6 pl-8 md:pl-16">
          {/* Vertical Connection Line */}
          <div className="absolute left-[27px] md:left-[59px] top-8 bottom-8 w-px bg-gradient-to-b from-primary via-blue-500 to-transparent"></div>

          {traces.map((t: any, index: number) => {
            const theme = getAgentTheme(t.agent);
            return (
            <div key={index} className="relative group">
              {/* Node Indicator */}
              <div className="absolute -left-8 md:-left-16 top-6 flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 shadow-lg bg-white ${theme.border} ${theme.text} ${theme.shadow}`}>
                  <span className="font-black text-sm">{index + 1}</span>
                </div>
                {/* Horizontal Connector */}
                <div className={`w-8 md:w-16 h-px ${theme.line}`}></div>
              </div>

              <div className={`bg-white/90 backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-300 border-l-4 shadow-sm hover:shadow-md ${theme.border}`}>
                {/* Agent Header */}
                <div className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between ${theme.bg}`}>
                  <div className="flex items-center gap-3">
                    <h3 className={`text-xl font-black tracking-wide ${theme.text}`}>{t.agent}</h3>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest ${
                    t.status === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    t.status === 'recovered' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse' :
                    'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                  }`}>
                    {t.status}
                  </span>
                </div>

                <div className="p-6">
                  {/* Context Block */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Input Payload</h4>
                    </div>
                    <pre className="bg-white p-4 rounded-xl text-[13px] text-gray-700 font-mono whitespace-pre-wrap border border-border overflow-x-auto shadow-sm">
                      {typeof t.input === 'string' ? `"${t.input}"` : JSON.stringify(t.input, null, 2)}
                    </pre>
                  </div>

                  {/* Reasoning Block */}
                  <div className="mb-6 relative">
                    <div className="absolute left-1.5 top-8 bottom-2 w-px bg-border z-0"></div>
                    <div className="flex items-center gap-2 mb-4 relative z-10">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                      <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest neon-text">Internal Reasoning Trace</h4>
                    </div>
                    <div className="space-y-3 relative z-10 pl-6">
                      {t.reasoning?.map((r: string, i: number) => (
                        <div key={i} className="flex gap-3 text-sm relative group/line">
                          {/* Node dot on the timeline */}
                          <div className={`absolute -left-[23px] top-1.5 w-2 h-2 rounded-full border border-white ${
                            r.includes('⚠') ? 'bg-yellow-400' : r.includes('❌') || r.includes('error') ? 'bg-red-500' : 'bg-gray-300 group-hover/line:bg-primary transition-colors'
                          }`}></div>
                          
                          <span className={`leading-relaxed ${
                            r.includes('⚠') ? 'text-yellow-600 font-medium' : 
                            r.includes('❌') || r.includes('error') ? 'text-red-600 font-bold' : 
                            r.includes('✅') || r.includes('confirmed') ? 'text-green-600 font-medium' :
                            'text-gray-700'
                          }`}>
                            {r}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Output Block */}
                  {t.output && (
                    <div className="mt-8 pt-6 border-t border-border border-dashed">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_#10b981]"></div>
                        <h4 className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Agent Output Vector</h4>
                      </div>
                      <pre className="bg-white p-4 rounded-xl text-[13px] text-green-700 font-mono whitespace-pre-wrap border border-green-500/20 overflow-x-auto shadow-sm">
                        {JSON.stringify(t.output, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )})}
          
          {/* End of Pipeline Marker */}
          <div className="relative pt-4">
             <div className="absolute -left-8 md:-left-16 top-6 flex items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center z-10 bg-white/80 backdrop-blur-sm border-2 border-green-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <span className="font-black text-green-500 text-lg">✓</span>
                </div>
             </div>
             <div className="pl-6 pt-2">
                <h3 className="text-gray-900 font-bold text-lg">Pipeline Execution Complete</h3>
                <p className="text-gray-500 text-sm mt-1">All agents have finalized their execution.</p>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
