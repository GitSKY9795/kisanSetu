import { useLocation, Navigate, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ProtectedRoute, { ROLE_HOME } from "./components/ProtectedRoute.jsx";
import FarmerOverview from "./pages/FarmerOverview.jsx";
import Profile from "./pages/Profile.jsx";
import FarmerDashboard from "./pages/FarmerDashboard.jsx";
import BuyerDashboard from "./pages/BuyerDashboard.jsx";
import FPODashboard from "./pages/FPODashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import PriceTrends from "./pages/PriceTrends.jsx";
import LogisticsStorage from "./pages/LogisticsStorage.jsx";
import GrievancePortal from "./pages/GrievancePortal.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AgentAssistantModal from "./components/AgentAssistantModal.jsx";
import FloatingAssistantButton from "./components/FloatingAssistantButton.jsx";
import { useAssistant } from "./context/AssistantContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useLanguage } from "./context/LanguageContext.jsx";

function RoleHomeRedirect() {
  const { role } = useAuth();
  return <Navigate to={(role && ROLE_HOME[role]) || "/login"} replace />;
}

const ANY_ROLE = ["FARMER", "BUYER", "FPO", "ADMIN"];

export default function App() {
  const { t } = useLanguage();
  const { isOpen, closeAssistant } = useAssistant();
  const { pathname } = useLocation();
  const isPublicRoute = pathname === "/" || pathname === "/login" || pathname === "/register";

  return (
    <div className={`app-shell min-h-screen text-gray-900 font-sans flex flex-col justify-between ${isPublicRoute ? "public-shell" : "authenticated-shell"}`}>
      <div>
        {!isPublicRoute && <Navbar />}
        <main className={isPublicRoute ? "" : "authenticated-content"}>
          <ErrorBoundary resetKey={pathname}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/home" element={<ProtectedRoute role={ANY_ROLE}><RoleHomeRedirect /></ProtectedRoute>} />

            <Route path="/farmer" element={<ProtectedRoute role="FARMER"><FarmerDashboard /></ProtectedRoute>} />
            <Route path="/farmer/profile" element={<ProtectedRoute role="FARMER"><FarmerOverview /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute role={["FARMER", "BUYER", "FPO"]}><Profile /></ProtectedRoute>} />
            <Route path="/farmer/my-profile" element={<Navigate to="/profile" replace />} />
            <Route path="/buyer" element={<ProtectedRoute role="BUYER"><BuyerDashboard /></ProtectedRoute>} />
            <Route path="/fpo" element={<ProtectedRoute role="FPO"><FPODashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />

            <Route path="/marketplace" element={<ProtectedRoute role={ANY_ROLE}><Marketplace /></ProtectedRoute>} />
            <Route path="/prices" element={<ProtectedRoute role={ANY_ROLE}><PriceTrends /></ProtectedRoute>} />
            <Route path="/prices/:crop" element={<ProtectedRoute role={ANY_ROLE}><PriceTrends /></ProtectedRoute>} />
            <Route path="/logistics" element={<ProtectedRoute role={ANY_ROLE}><LogisticsStorage /></ProtectedRoute>} />
            <Route path="/grievances" element={<ProtectedRoute role={ANY_ROLE}><GrievancePortal /></ProtectedRoute>} />
          </Routes>
          </ErrorBoundary>
        </main>
      </div>

      {!isPublicRoute && (
        <footer className="app-footer">
          {t("KisanSetu — strengthening market linkages and transparent price discovery for Indian farmers")}
        </footer>
      )}

      {/* Persistent Floating AI Assistant Button */}
      {!isPublicRoute && <FloatingAssistantButton />}

      {/* Modal */}
      <AgentAssistantModal isOpen={isOpen} onClose={closeAssistant} />
    </div>
  );
}
