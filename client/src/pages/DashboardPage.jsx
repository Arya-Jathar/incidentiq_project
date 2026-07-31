import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useIncidentStore } from "../store/useIncidentStore";
import Layout from "../components/Layout";
import MetricCard from "../components/MetricCard";
import IncidentCard from "../components/IncidentCard";
import AgentPipeline from "../components/AgentPipeline";
import LoadingSpinner from "../components/LoadingSpinner";
import { useToastStore } from "../store/useToastStore";
import { API_URL } from "../config";

function DashboardPage() {
    const { token } = useAuth();
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [incidentDescription, setIncidentDescription] = useState("");
    const addToast = useToastStore((state) => state.addToast);
    const setUnresolvedCount = useIncidentStore((state) => state.setUnresolvedCount);

    const fetchIncidents = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/api/incidents`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (Array.isArray(data)) {
                setIncidents(data);
                const unresolved = data.filter((i) => i.status !== "resolved");
                setUnresolvedCount(unresolved.length);
            }
        } catch (error) {
            addToast("Failed to load incidents", "error");
        } finally {
            setLoading(false);
        }
    }, [token, setUnresolvedCount]);

    useEffect(() => {
        fetchIncidents();
    }, [fetchIncidents]);

    const unresolvedCount = incidents.filter((i) => i.status !== "resolved").length;
    const resolvedCount = incidents.filter((i) => i.status === "resolved").length;

    if (loading) return <Layout><LoadingSpinner message="Loading dashboard..." /></Layout>;

    return (
        <Layout>
            <h1 className="text-xl font-semibold text-white mb-6">Dashboard</h1>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <MetricCard label="Total incidents" value={incidents.length} sublabel="All time" />
                <MetricCard label="Open" value={unresolvedCount} sublabel="Needs attention" accent="danger" />
                <MetricCard label="Resolved" value={resolvedCount} sublabel="Handled" accent="success" />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-gray-300 mb-4">Active incidents</h2>
                    {incidents.length === 0 ? (
                        <p className="text-gray-500 text-sm">No incidents right now.</p>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {incidents.slice(0, 5).map((incident) => (
                                <IncidentCard
                                    key={incident._id}
                                    id={incident._id}
                                    title={incident.title}
                                    severity={incident.severity}
                                    status={incident.status}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                        <h2 className="text-sm font-semibold text-gray-300 mb-2">Incident description</h2>
                        <p className="text-xs text-gray-600 mb-3">
                            Type or paste an incident below, or leave empty to let the real-time monitor trigger automatically.
                        </p>
                        <textarea
                            value={incidentDescription}
                            onChange={(e) => setIncidentDescription(e.target.value)}
                            placeholder="e.g. SQL injection attempt detected on /api/login. UnauthorizedError thrown, attacker IP: 192.168.1.100"
                            rows={3}
                            className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 resize-none transition-colors"
                        />
                    </div>

                    <AgentPipeline
                        incidentDescription={incidentDescription}
                        onPipelineComplete={fetchIncidents}
                    />
                </div>
            </div>
        </Layout>
    );
}

export default DashboardPage;