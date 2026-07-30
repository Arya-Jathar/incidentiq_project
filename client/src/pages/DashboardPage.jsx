import { useState, useEffect } from "react";
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
    const addToast = useToastStore((state) => state.addToast);
    const setUnresolvedCount = useIncidentStore((state) => state.setUnresolvedCount);

    useEffect(() => {
        const fetchIncidents = async () => {
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
        };

        fetchIncidents();
    }, [token, setUnresolvedCount]);

    const unresolvedCount = incidents.filter((i) => i.status !== "resolved").length;
    const resolvedCount = incidents.filter((i) => i.status === "resolved").length;

    if (loading) return <Layout><LoadingSpinner message="Loading dashboard..." /></Layout>;

    return (
        <Layout>
            <h1 className="text-xl font-semibold text-white mb-6">Dashboard</h1>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <MetricCard
                    label="Total incidents"
                    value={incidents.length}
                    sublabel="All time"
                />
                <MetricCard
                    label="Open"
                    value={unresolvedCount}
                    sublabel="Needs attention"
                    accent="danger"
                />
                <MetricCard
                    label="Resolved"
                    value={resolvedCount}
                    sublabel="Handled"
                    accent="success"
                />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h2 className="text-sm font-semibold text-gray-300 mb-4">Active incidents</h2>

                    {incidents.length === 0 ? (
                        <p className="text-gray-500 text-sm">No incidents right now.</p>
                    ) : (
                        incidents.map((incident) => (
                            <IncidentCard
                                key={incident._id}
                                id={incident._id}
                                title={incident.title}
                                severity={incident.severity}
                                status={incident.status}
                            />
                        ))
                    )}
                </div>

                <AgentPipeline incidentDescription={incidents[0]?.title} />
            </div>
        </Layout>
    );
}

export default DashboardPage;