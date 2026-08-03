import { useState, useEffect } from "react";
import { socket } from "../socket";
import { useToastStore } from "../store/useToastStore";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

const AGENT_ICONS = {
    "Triage": "🔍",
    "Root Cause": "🧠",
    "Runbook": "📖",
    "Comms": "📣",
    "Postmortem": "📝"
};

const AGENT_COLORS = {
    "Triage": "border-l-red-500",
    "Root Cause": "border-l-orange-500",
    "Runbook": "border-l-blue-500",
    "Comms": "border-l-purple-500",
    "Postmortem": "border-l-green-500"
};

function AgentPipeline({ incidentDescription, onPipelineComplete, token }) {
    const { user } = useAuth();
    const [updates, setUpdates] = useState([]);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [mode, setMode] = useState(null); // null | 'improve'
    const [customSolution, setCustomSolution] = useState("");
    const [resolving, setResolving] = useState(false);
    const [showRunbookForm, setShowRunbookForm] = useState(false);
    const [runbookTitle, setRunbookTitle] = useState("");
    const [runbookService, setRunbookService] = useState("");
    const [runbookSteps, setRunbookSteps] = useState("");
    const [creatingRunbook, setCreatingRunbook] = useState(false);
    const addToast = useToastStore((state) => state.addToast);

    useEffect(() => {
        const handleAgentUpdate = (agent) => {
            setUpdates((prev) => [...prev, agent]);
        };

        const handleError = () => {
            setRunning(false);
            addToast("Pipeline failed to run", "error");
        };

        const handleComplete = (data) => {
            setRunning(false);
            setResult(data);
            addToast("Pipeline complete — review the AI solution below", "success");
            if (data.noRunbook) {
                setShowRunbookForm(true);
                setRunbookTitle(data.root_cause ? `Fix: ${data.root_cause}` : "Incident Resolution");
                setRunbookService(data.affected_service || "");
                const steps = [];
                if (data.fix_applied) steps.push(data.fix_applied);
                if (Array.isArray(data.prevention_steps)) steps.push(...data.prevention_steps);
                setRunbookSteps(steps.join("\n"));
            }
            if (onPipelineComplete) onPipelineComplete();
        };

        socket.on("agent-update", handleAgentUpdate);
        socket.on("pipeline-error", handleError);
        socket.on("pipeline-complete", handleComplete);

        return () => {
            socket.off("agent-update", handleAgentUpdate);
            socket.off("pipeline-error", handleError);
            socket.off("pipeline-complete", handleComplete);
        };
    }, [onPipelineComplete]);

    const handleRun = () => {
        setUpdates([]);
        setResult(null);
        setMode(null);
        setCustomSolution("");
        setShowRunbookForm(false);
        setRunning(true);
        socket.emit("run-pipeline", { incident_description: incidentDescription });
    };

    const resolveIncident = async (resolution, solution) => {
        if (!result?.incidentId) return;
        setResolving(true);
        try {
            const body = {
                status: resolution === "ai-rejected" ? "in-progress" : "resolved",
                resolution,
                ...(solution ? { customSolution: solution } : {})
            };
            const res = await fetch(`${API_URL}/api/incidents/${result.incidentId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                addToast("✅ Incident resolved!", "success");
                
                // Update Postmortem if custom solution provided
                if (solution && result.postmortemId) {
                    try {
                        await fetch(`${API_URL}/api/postmortems/${result.postmortemId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({
                                fixApplied: solution,
                                generatedBy: "human"
                            })
                        });
                    } catch (e) {
                        console.error("Failed to update postmortem", e);
                    }
                }
                
                // Auto-create runbook for future use
                if (result.noRunbook) {
                    const stepsArray = solution 
                        ? solution.split("\n").map(s => s.trim()).filter(Boolean)
                        : [result.fix_applied, ...(result.prevention_steps || [])].filter(Boolean);
                    
                    try {
                        await fetch(`${API_URL}/api/runbooks`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({
                                title: result.root_cause ? `Runbook: ${result.root_cause}` : "Auto-generated Runbook",
                                service: result.affected_service || "General",
                                steps: stepsArray.length ? stepsArray : ["Investigate issue manually"]
                            })
                        });
                        addToast("Solution automatically added to Runbooks! 📖", "success");
                        setShowRunbookForm(false);
                    } catch (e) {
                        console.error("Runbook auto-create failed", e);
                    }
                }

                if (onPipelineComplete) onPipelineComplete();
                setResult((prev) => ({ ...prev, resolved: true, resolution }));
                setMode(null);
            } else {
                addToast("Failed to resolve incident", "error");
            }
        } catch (e) {
            addToast("Failed to resolve incident", "error");
        } finally {
            setResolving(false);
        }
    };

    const handleCreateRunbook = async () => {
        if (!runbookTitle.trim() || !runbookService.trim() || !runbookSteps.trim()) {
            addToast("Please fill in all runbook fields", "error");
            return;
        }
        setCreatingRunbook(true);
        try {
            const stepsArray = runbookSteps.split("\n").map((s) => s.trim()).filter(Boolean);
            const res = await fetch(`${API_URL}/api/runbooks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ title: runbookTitle, service: runbookService, steps: stepsArray })
            });
            if (res.ok) {
                addToast("Runbook created and embedded! ✅", "success");
                setShowRunbookForm(false);
                setRunbookTitle(""); setRunbookService(""); setRunbookSteps("");
            } else {
                const err = await res.json();
                addToast(err.message || "Failed to create runbook", "error");
            }
        } catch (e) {
            addToast("Failed to create runbook", "error");
        } finally {
            setCreatingRunbook(false);
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-300">AI Agent Pipeline</h2>
                    <p className="text-xs text-gray-600 mt-0.5">5-agent LangGraph pipeline</p>
                </div>
                <button
                    onClick={handleRun}
                    disabled={running || !incidentDescription || user?.role === "viewer"}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {user?.role === "viewer" ? "View Only" : running ? "Running..." : "Run Pipeline"}
                </button>
            </div>

            {running && (
                <div className="flex items-center gap-2 text-xs text-blue-400">
                    <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Agents working...
                </div>
            )}

            {updates.length > 0 && (
                <div className="flex flex-col gap-2">
                    {updates.map((agent, i) => (
                        <div key={i} className={`text-xs bg-gray-800/60 px-3 py-2.5 rounded-lg border-l-2 ${AGENT_COLORS[agent.name] || "border-l-gray-600"}`}>
                            <span className="mr-1.5">{AGENT_ICONS[agent.name] || "🤖"}</span>
                            <span className="font-semibold text-gray-100">{agent.name}:</span>{" "}
                            <span className="text-gray-400">{agent.result}</span>
                        </div>
                    ))}
                </div>
            )}

            {result && !running && (
                <div className="flex flex-col gap-3">
                    {/* Summary banner */}
                    <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-green-400">✅ Pipeline complete</p>
                            {result.resolved && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${result.resolution === 'ai-rejected' ? 'bg-red-900/40 text-red-400 border-red-800' : 'bg-green-900/40 text-green-400 border-green-800'}`}>
                                    {result.resolution === "ai-accepted" ? "AI solution accepted" : result.resolution === "ai-rejected" ? "AI solution rejected" : "Custom solution applied"}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500">
                            {result.incidentId && (
                                <span>Incident: <span className="text-blue-400 font-mono">...{String(result.incidentId).slice(-6)}</span></span>
                            )}
                            {result.postmortemId && (
                                <span>Postmortem: <span className="text-purple-400 font-mono">...{String(result.postmortemId).slice(-6)}</span></span>
                            )}
                        </div>
                        {result.noRunbook && !result.resolved && (
                            <p className="text-xs text-yellow-400 mt-1">⚠️ No matching runbook — create one below</p>
                        )}
                    </div>

                    {/* Accept / Improve buttons */}
                    {!result.resolved && (
                        <div className="flex flex-col gap-2">
                            <p className="text-xs text-gray-400 font-medium">Is this solution acceptable?</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => resolveIncident("ai-accepted", null)}
                                    disabled={resolving}
                                    className="flex-1 px-3 py-2 text-xs font-medium bg-green-700 text-white rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
                                >
                                    {resolving ? "Resolving..." : "✅ Accept"}
                                </button>
                                <button
                                    onClick={() => setMode(mode === "improve" ? null : "improve")}
                                    disabled={resolving}
                                    className="flex-1 px-3 py-2 text-xs font-medium bg-orange-700 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 transition-colors"
                                >
                                    ✏️ Improve
                                </button>
                                <button
                                    onClick={() => resolveIncident("ai-rejected", null)}
                                    disabled={resolving}
                                    className="flex-1 px-3 py-2 text-xs font-medium bg-red-800/80 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                                >
                                    ❌ Reject
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Improve mode — custom solution textarea */}
                    {mode === "improve" && !result.resolved && (
                        <div className="bg-orange-950/30 border border-orange-800/50 rounded-lg p-4 flex flex-col gap-3">
                            <p className="text-xs font-semibold text-orange-300">✏️ Your solution</p>
                            <textarea
                                value={customSolution}
                                onChange={(e) => setCustomSolution(e.target.value)}
                                placeholder="Describe what you actually did to fix this incident..."
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 resize-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => resolveIncident("custom-resolved", customSolution)}
                                    disabled={resolving || !customSolution.trim()}
                                    className="px-4 py-1.5 text-xs font-medium bg-orange-600 text-white rounded-md hover:bg-orange-500 disabled:opacity-50 transition-colors"
                                >
                                    {resolving ? "Resolving..." : "Mark as Resolved"}
                                </button>
                                <button
                                    onClick={() => setMode(null)}
                                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Create runbook form */}
                    {showRunbookForm && (
                        <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-lg p-4 flex flex-col gap-3">
                            <p className="text-xs font-semibold text-yellow-300">📖 Create a runbook for this incident type</p>
                            <input
                                type="text"
                                placeholder="Runbook title (e.g. SQL Injection Response)"
                                value={runbookTitle}
                                onChange={(e) => setRunbookTitle(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-yellow-500/50"
                            />
                            <input
                                type="text"
                                placeholder="Affected service (e.g. Authentication API)"
                                value={runbookService}
                                onChange={(e) => setRunbookService(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-yellow-500/50"
                            />
                            <textarea
                                placeholder={`Steps (one per line):\nBlock malicious IP\nPatch input validation\nRotate DB credentials`}
                                value={runbookSteps}
                                onChange={(e) => setRunbookSteps(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-yellow-500/50 resize-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreateRunbook}
                                    disabled={creatingRunbook || !runbookTitle || !runbookService || !runbookSteps}
                                    className="px-3 py-1.5 text-xs font-medium bg-yellow-600 text-white rounded-md hover:bg-yellow-500 disabled:opacity-50 transition-colors"
                                >
                                    {creatingRunbook ? "Creating..." : "Create Runbook"}
                                </button>
                                <button
                                    onClick={() => setShowRunbookForm(false)}
                                    className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {updates.length === 0 && !running && !result && (
                <p className="text-sm text-gray-500">Click "Run Pipeline" to analyze an incident.</p>
            )}
        </div>
    );
}

export default AgentPipeline;
