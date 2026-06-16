import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const admin = localStorage.getItem("admin");

  if (!admin) {
    return <Navigate to="/" replace />;
  }

  return children;
}