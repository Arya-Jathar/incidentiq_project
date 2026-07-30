import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Layout({ children }) {
    const { logout } = useAuth();

    const navItems = [
        { to: "/dashboard", label: "Dashboard", icon: "📊" },
        { to: "/incidents", label: "Incidents", icon: "⚠️" },
        { to: "/runbooks", label: "Runbooks", icon: "📖" },
        { to: "/postmortems", label: "Postmortems", icon: "📄" },
    ];

    return (
        <div className="flex min-h-screen bg-gray-950 text-gray-100">
            <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col p-4">
                <div className="flex items-center gap-2 mb-8 px-2">
                    <span className="text-xl">⚡</span>
                    <span className="font-semibold text-white">IncidentIQ</span>
                </div>

                <nav className="flex flex-col gap-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    isActive
                                        ? "bg-gray-800 text-white font-medium"
                                        : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                                }`
                            }
                        >
                            <span>{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <button
                    onClick={logout}
                    className="mt-auto px-3 py-2 text-sm text-gray-400 hover:text-gray-200 text-left rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                    ⎋ Logout
                </button>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        </div>
    );
}

export default Layout;