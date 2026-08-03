import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import IncidentCard from "../components/IncidentCard";
import LoadingSpinner from "../components/LoadingSpinner";
import { useToastStore } from "../store/useToastStore";
import { API_URL } from "../config";

function IncidentsPage() {
    const { token } = useAuth();
    const [incidents, setIncidents] = useState([]);
    const [filter, setFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const addToast = useToastStore((state) => state.addToast);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchIncidents = async () => {
            try {
                const response = await fetch(`${API_URL}/api/incidents`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();
                if (Array.isArray(data)) setIncidents(data);
            } catch (error) {
                addToast("Failed to load incidents", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchIncidents();
    }, [token]);

    const filteredIncidents = incidents.filter((incident) => {
        if (filter === "all") return true;
        if (filter === "open") return incident.status !== "resolved";
        if (filter === "resolved") return incident.status === "resolved";
        return true;
    });

    const filters = [
        { key: "all", label: "All" },
        { key: "open", label: "Open" },
        { key: "resolved", label: "Resolved" },
    ];

    if (loading) return <Layout><LoadingSpinner message="Loading incidents..." /></Layout>;

    return (
        <Layout>
            <h1 className="text-xl font-semibold text-white mb-6">Incidents</h1>

            <div className="flex gap-2 mb-5">
                {filters.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            filter === f.key
                                ? "bg-blue-600 text-white"
                                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                {filteredIncidents.length === 0 ? (
                    <p className="text-gray-500 text-sm">No incidents match this filter.</p>
                ) : (
                    filteredIncidents.map((incident) => (
                        <IncidentCard
                            key={incident._id}
                            id={incident._id}
                            title={incident.title}
                            severity={incident.severity}
                            status={incident.status}
                            description={incident.description}
                            onRunPipeline={(desc) => navigate("/", { state: { runIncident: desc } })}
                        />
                    ))
                )}
            </div>
        </Layout>
    );
}

export default IncidentsPage;