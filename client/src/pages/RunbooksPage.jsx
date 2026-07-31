import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import LoadingSpinner from "../components/LoadingSpinner";
import { useToastStore } from "../store/useToastStore";
import { API_URL } from "../config";

function RunbooksPage() {
    const { token } = useAuth();
    const [runbooks, setRunbooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const addToast = useToastStore((state) => state.addToast);

    useEffect(() => {
        const fetchRunbooks = async () => {
            try {
                const response = await fetch(`${API_URL}/api/runbooks`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await response.json();
                if (Array.isArray(data)) setRunbooks(data);
            } catch (error) {
                addToast("Failed to load runbooks", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchRunbooks();
    }, [token]);

    if (loading) return <Layout><LoadingSpinner message="Loading runbooks..." /></Layout>;

    return (
        <Layout>
            <h1 className="text-xl font-semibold text-white mb-6">Runbooks</h1>

            <div className="grid grid-cols-2 gap-4">
                {runbooks.length === 0 ? (
                    <p className="text-gray-500 text-sm">No runbooks yet.</p>
                ) : (
                    runbooks.map((runbook) => (
                        <div key={runbook._id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-medium text-gray-100">{runbook.title}</h3>
                                <span className="text-xs text-gray-500">{runbook.service}</span>
                            </div>

                            <ol className="text-sm text-gray-400 list-decimal list-inside space-y-1">
                                {(runbook.steps || []).map((step, i) => (
                                    <li key={i}>{step}</li>
                                ))}
                            </ol>

                            <div className="flex gap-1 mt-3">
                                {(runbook.tags || []).map((tag) => (
                                    <span key={tag} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Layout>
    );
}

export default RunbooksPage;