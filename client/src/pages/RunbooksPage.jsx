import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import LoadingSpinner from "../components/LoadingSpinner";
import { useToastStore } from "../store/useToastStore";
import { API_URL } from "../config";

function RunbooksPage() {
    const { token, user } = useAuth();
    const [runbooks, setRunbooks] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Create form state
    const [showForm, setShowForm] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newService, setNewService] = useState("");
    const [newSteps, setNewSteps] = useState("");
    const [creating, setCreating] = useState(false);
    
    const addToast = useToastStore((state) => state.addToast);

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

    useEffect(() => {
        fetchRunbooks();
    }, [token]);

    const handleCreateRunbook = async (e) => {
        e.preventDefault();
        if (!newTitle.trim() || !newService.trim() || !newSteps.trim()) {
            addToast("Please fill in all fields", "error");
            return;
        }

        setCreating(true);
        try {
            const stepsArray = newSteps.split("\n").map(s => s.trim()).filter(Boolean);
            const response = await fetch(`${API_URL}/api/runbooks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newTitle,
                    service: newService,
                    steps: stepsArray
                })
            });

            if (response.ok) {
                addToast("Runbook created successfully!", "success");
                setShowForm(false);
                setNewTitle("");
                setNewService("");
                setNewSteps("");
                fetchRunbooks(); // Refresh the list
            } else {
                const err = await response.json();
                addToast(err.message || "Failed to create runbook", "error");
            }
        } catch (error) {
            addToast("Failed to create runbook", "error");
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <Layout><LoadingSpinner message="Loading runbooks..." /></Layout>;

    return (
        <Layout>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-semibold text-white">Runbooks</h1>
                {user?.role !== "viewer" && (
                    <button 
                        onClick={() => setShowForm(!showForm)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md text-sm transition-colors"
                    >
                        {showForm ? "Cancel" : "+ Add Runbook"}
                    </button>
                )}
            </div>

            {showForm && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
                    <h2 className="text-lg font-medium text-gray-100 mb-4">Create New Runbook</h2>
                    <form onSubmit={handleCreateRunbook} className="flex flex-col gap-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. Database Connection Fix"
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-400 mb-1">Service</label>
                                <input
                                    type="text"
                                    value={newService}
                                    onChange={(e) => setNewService(e.target.value)}
                                    placeholder="e.g. User API"
                                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Steps (one per line)</label>
                            <textarea
                                value={newSteps}
                                onChange={(e) => setNewSteps(e.target.value)}
                                placeholder="1. Restart the service&#10;2. Check logs&#10;3. Verify connection"
                                rows={4}
                                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={creating}
                                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                {creating ? "Saving..." : "Save Runbook"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

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