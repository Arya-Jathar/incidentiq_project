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

function AgentPipeline({ incidentDescription, onPipelineComplete }) {
    const [updates, setUpdates] = useState([]);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const [showRunbookForm, setShowRunbookForm] = useState(false);
    const [runbookTitle, setRunbookTitle] = useState("");
    const [runbookService, setRunbookService] = useState("");
    const [runbookSteps, setRunbookSteps] = useState("");
    const [creatingRunbook, setCreatingRunbook] = useState(false);
    const { token } = useAuth();
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
            addToast("Pipeline complete — incident auto-saved!", "success");
            if (data.noRunbook) {
                setShowRunbookForm(true);
                addToast("No runbook found — create one below", "info");
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
        setShowRunbookForm(false);
        setRunning(true);
        socket.emit("run-pipeline", { incident_description: incidentDescription });
    };

    const handleCreateRunbook = async () => {
        if (!runbookTitle.trim() || !runbookService.trim() || !runbookSteps.trim()) {
            addToast("Please fill in all runbook fields", "error");
            return;
        }
        setCreatingRunbook(true);
        try {
            const stepsArray = runbookSteps
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);

            const res = await fetch(`${API_URL}/api/runbooks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: runbookTitle,
                    service: runbookService,
                    steps: stepsArray
                })
            });
            if (res.ok) {
                addToast("Runbook created and embedded! ✅", "success");
                setShowRunbookForm(false);
                setRunbookTitle("");
                setRunbookService("");
                setRunbookSteps("");
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
                    disabled={running || !incidentDescription}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {running ? "Running..." : "Run Pipeline"}
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
                        <div
                            key={i}
                            className={`text-xs bg-gray-800/60 px-3 py-2.5 rounded-lg border-l-2 ${AGENT_COLORS[agent.name] || "border-l-gray-600"}`}
                        >
                            <span className="mr-1.5">{AGENT_ICONS[agent.name] || "🤖"}</span>
                            <span className="font-semibold text-gray-100">{agent.name}:</span>{" "}
                            <span className="text-gray-400">{agent.result}</span>
                        </div>
                    ))}
                </div>
            )}

            {result && !running && (
                <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3 flex flex-col gap-2">
                    <p className="text-xs font-semibold text-green-400">✅ Pipeline complete — incident &amp; postmortem auto-saved</p>
                    <div className="flex gap-4 text-xs text-gray-500">
                        {result.incidentId && (
                            <span>Incident ID: <span className="text-blue-400 font-mono">...{String(result.incidentId).slice(-6)}</span></span>
                        )}
                        {result.postmortemId && (
                            <span>Postmortem ID: <span className="text-purple-400 font-mono">...{String(result.postmortemId).slice(-6)}</span></span>
                        )}
                    </div>
                    {result.noRunbook && (
                        <p className="text-xs text-yellow-400">⚠️ No matching runbook — fill the form below to create one</p>
                    )}
                </div>
            )}

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
                        placeholder="Affected service (e.g. Authentication, Payment API)"
                        value={runbookService}
                        onChange={(e) => setRunbookService(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-yellow-500/50"
                    />
                    <textarea
                        placeholder={`Steps (one per line):\nBlock malicious IP\nPatch input validation\nRotate DB credentials\nNotify security team`}
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

            {updates.length === 0 && !running && !result && (
                <p className="text-sm text-gray-500">Click "Run Pipeline" to analyze an incident.</p>
            )}
        </div>
    );
}

export default AgentPipeline;
