import { useState, useEffect } from "react";
import { socket } from "../socket";
import { useToastStore } from "../store/useToastStore";

function AgentPipeline({ incidentDescription }) {
    const [updates, setUpdates] = useState([]);
    const [running, setRunning] = useState(false);
    const addToast = useToastStore((state) => state.addToast);

    useEffect(() => {
    const handleAgentUpdate = (agent) => {
        setUpdates((prev) => [...prev, agent]);
    };

    const handleError = (error) => {
        setRunning(false);
        addToast("Pipeline failed to run", "error");
    }

    const handleComplete = () => {
        setRunning(false);
        addToast("Pipeline complete", "success");
    };

    socket.on("agent-update", handleAgentUpdate);
    socket.on("pipeline-error", handleError);
    socket.on("pipeline-complete", handleComplete);
    return () => {
        socket.off("agent-update", handleAgentUpdate);
        socket.off("pipeline-error", handleError);
        socket.off("pipeline-complete", handleComplete);
    };
    }, []);

    const handleRun = () => {
        setUpdates([]);
        setRunning(true);
        socket.emit("run-pipeline", {
            incident_description: incidentDescription
        });
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-300">AI Agent Pipeline</h2>
                <button
                    onClick={handleRun}
                    disabled={running || !incidentDescription}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {running ? "Running..." : "Run Pipeline"}
                </button>
            </div>

            <div className="flex flex-col gap-2">
                {updates.map((agent, index) => (
                    <div key={index} className="text-xs text-gray-300 bg-gray-800/50 px-3 py-2 rounded-md">
                        <span className="font-medium text-gray-100">{agent.name}:</span> {agent.result}
                    </div>
                ))}
            </div>
            
            {updates.length === 0 && !running && (
                <p className="text-sm text-gray-500">Click "Run Pipeline" to analyze an incident.</p>
            )}
        </div>
    );
}

export default AgentPipeline;
