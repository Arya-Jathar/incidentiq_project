function MetricCard({ label, value, sublabel, accent }) {
    const accentColors = {
        default: "text-white",
        danger: "text-red-400",
        success: "text-green-400",
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-semibold ${accentColors[accent] || accentColors.default}`}>
                {value}
            </p>
            <p className="text-xs text-gray-500 mt-1">{sublabel}</p>
        </div>
    );
}

export default MetricCard;