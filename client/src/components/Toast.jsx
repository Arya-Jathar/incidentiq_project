import { useToastStore } from "../store/useToastStore";

const typeStyles = {
    success: "bg-green-900/80 border-green-700 text-green-200",
    error: "bg-red-900/80 border-red-700 text-red-200",
    info: "bg-blue-900/80 border-blue-700 text-blue-200"
};

const typeIcons = {
    success: "✓",
    error: "✕",
    info: "ℹ"
};

function Toast() {
    const toasts = useToastStore((state) => state.toasts);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium shadow-lg backdrop-blur-sm animate-[slideIn_0.3s_ease-out] ${typeStyles[toast.type] || typeStyles.info}`}
                >
                    <span className="text-base">{typeIcons[toast.type] || typeIcons.info}</span>
                    {toast.message}
                </div>
            ))}
        </div>
    );
}

export default Toast;
