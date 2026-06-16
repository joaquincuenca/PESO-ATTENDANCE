import { Link, useNavigate } from "react-router-dom";
import logo from "/PESOLOGO.png"; // Ensure the file exists in the public folder

export default function Layout({ children }) {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem("admin"));

  const handleLogout = () => {
    localStorage.removeItem("admin");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard" className="flex items-center">
                <img
                  src={logo}
                  alt="PESO Logo"
                  className="w-10 h-10 object-contain"
                />
              </Link>
              <h1 className="text-xl font-bold text-gray-800">
                PESO Attendance
              </h1>

              <div className="hidden md:flex space-x-4 ml-10">
                <Link
                  to="/dashboard"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded"
                >
                  Dashboard
                </Link>
                <Link
                  to="/employees"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded"
                >
                  Employees
                </Link>
                <Link
                  to="/attendance-records"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded"
                >
                  Attendance Records
                </Link>
                <Link
                  to="/reports"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded"
                >
                  Reports
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {admin?.username || "Admin"}
              </span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}