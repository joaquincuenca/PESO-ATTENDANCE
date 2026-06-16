import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { supabase } from "../services/supabase";
import { 
  Users, 
  UserCheck, 
  Clock, 
  Calendar,
  TrendingUp,
  Building2,
  RefreshCw
} from "lucide-react";

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    timedOut: 0,
    monthlyLogs: 0,
    pendingFaces: 0,
    departments: 0,
    attendanceRate: 0,
    lateToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [employees, setEmployees] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    
    try {
      // Fetch all employees
      const { data: employeesData } = await supabase
        .from("employees")
        .select("*");
      
      const totalEmployees = employeesData?.length || 0;
      const pendingFaces = employeesData?.filter(emp => !emp.face_descriptor).length || 0;
      const departments = [...new Set(employeesData?.map(emp => emp.department).filter(Boolean))].length || 0;
      
      // Create employee map for names
      const empMap = {};
      employeesData?.forEach(emp => {
        empMap[emp.id] = emp.fullname;
      });
      setEmployees(empMap);
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's attendance
      const { data: todayAttendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("attendance_date", today);
      
      const presentToday = todayAttendance?.filter(record => record.time_in).length || 0;
      const timedOut = todayAttendance?.filter(record => record.time_out).length || 0;
      
      // Calculate late arrivals (after 8:00 AM)
      const lateToday = todayAttendance?.filter(record => {
        if (!record.time_in) return false;
        const timeInHour = new Date(record.time_in).getHours();
        const timeInMinute = new Date(record.time_in).getMinutes();
        return timeInHour > 8 || (timeInHour === 8 && timeInMinute > 0);
      }).length || 0;
      
      // Fetch current month's attendance
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const { data: monthlyData } = await supabase
        .from("attendance")
        .select("*")
        .gte("attendance_date", startOfMonth)
        .lte("attendance_date", endOfMonth);
      
      const monthlyLogs = monthlyData?.length || 0;
      
      // Calculate attendance rate
      const uniqueEmployeesWithAttendance = [...new Set(monthlyData?.map(record => record.employee_id))].length || 0;
      const attendanceRate = totalEmployees > 0 ? Math.round((uniqueEmployeesWithAttendance / totalEmployees) * 100) : 0;
      
      // Fetch recent attendance records (last 5)
      const { data: recent } = await supabase
        .from("attendance")
        .select("*")
        .order("attendance_date", { ascending: false })
        .limit(5);
      
      setRecentAttendance(recent || []);
      
      // Update stats
      setStats({
        totalEmployees,
        presentToday,
        timedOut,
        monthlyLogs,
        pendingFaces,
        departments,
        attendanceRate,
        lateToday
      });
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Format time helper
  const formatTime = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of attendance system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? "..." : stats.totalEmployees}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {stats.pendingFaces} pending face registration
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Present Today</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? "..." : stats.presentToday}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-green-500 opacity-50" />
          </div>
          <div className="mt-2 text-xs text-gray-400">
            {stats.lateToday} late arrivals
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Timed Out</p>
              <p className="text-2xl font-bold text-orange-600">
                {loading ? "..." : stats.timedOut}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Completed time out today
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Attendance Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {loading ? "..." : `${stats.attendanceRate}%`}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
          <div className="mt-2 text-xs text-gray-400">
            This month's attendance rate
          </div>
        </div>
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Monthly Logs</p>
              <p className="text-2xl font-bold text-indigo-600">
                {loading ? "..." : stats.monthlyLogs}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-indigo-500 opacity-50" />
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Total attendance records this month
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Departments</p>
              <p className="text-2xl font-bold text-cyan-600">
                {loading ? "..." : stats.departments}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-cyan-500 opacity-50" />
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Active departments
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Employee</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Time In</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Time Out</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-center text-gray-500">Loading...</td>
                </tr>
              ) : recentAttendance.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-4 text-center text-gray-500">No recent activity</td>
                </tr>
              ) : (
                recentAttendance.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-900">{employees[record.employee_id] || "Unknown"}</td>
                    <td className="px-4 py-2 text-gray-500">{record.attendance_date}</td>
                    <td className="px-4 py-2">
                      {record.time_in ? (
                        <span className="text-green-600">{formatTime(record.time_in)}</span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-2">
                      {record.time_out ? (
                        <span className="text-blue-600">{formatTime(record.time_out)}</span>
                      ) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refresh button */}
      <div className="mt-4 text-right">
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>
    </Layout>
  );
}