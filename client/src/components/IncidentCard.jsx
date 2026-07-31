import { useState } from "react";
import { useToastStore } from "../store/useToastStore";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

const severityStyles = {
    P0: "bg-red-100 text-red-700",
    P1: "bg-orange-100 text-orange-700",
    P2: "bg-yellow-100 text-yellow-700",
    P3: "bg-green-100 text-green-700"
};

function IncidentCard({ id, title, severity, status, onDelete }) {
    const [currentStatus, setCurrentStatus] = useState(status);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const addToast = useToastStore((state) => state.addToast);
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    const handleResolve = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/api/incidents/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: "resolved" })
            });
            const data = await response.json();
            setCurrentStatus(data.status);
            addToast("Incident resolved", "success");
        } catch (error) {
            addToast("Failed to resolve incident", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete incident "${title}"? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/api/incidents/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                addToast("Incident deleted", "success");
                if (onDelete) onDelete(id);
            } else {
                addToast("Failed to delete incident", "error");
            }
        } catch (error) {
            addToast("Failed to delete incident", "error");
        } finally {
            setDeleting(false);
        }
    };

    const isResolved = currentStatus === "resolved";

    return (
        <div className="flex items-center justify-between p-3 mb-2 bg-gray-800/50 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className={`px-2 py-1 rounded-md text-xs font-semibold shrink-0 ${severityStyles[severity] || "bg-gray-700 text-gray-300"}`}>
                    {severity}
                </span>
                <p className={`text-sm truncate ${isResolved ? "text-gray-500 line-through" : "text-gray-200"}`}>
                    {title}
                </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                    onClick={handleResolve}
                    disabled={isResolved || loading}
                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? "Resolving..." : isResolved ? "Resolved" : "Resolve"}
                </button>

                {isAdmin && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        title="Delete incident"
                        className="px-2 py-1.5 text-xs font-medium rounded-md bg-red-900/50 text-red-400 hover:bg-red-800 hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {deleting ? "..." : "🗑"}
                    </button>
                )}
            </div>
        </div>
    );
}

export default IncidentCard;