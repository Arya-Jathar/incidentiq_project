import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import IncidentsPage from "./pages/IncidentsPage";
import RunbooksPage from "./pages/RunbooksPage";
import PostmortemsPage from "./pages/PostmortemsPage";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/incidents"
                element={
                    <ProtectedRoute>
                        <IncidentsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/runbooks"
                element={
                    <ProtectedRoute>
                        <RunbooksPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/postmortems"
                element={
                    <ProtectedRoute>
                        <PostmortemsPage />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

export default App;