import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import Layout from "../components/Layout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { Download, Calendar, Users, Clock, CheckCircle, AlertCircle } from "lucide-react";

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);

  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalAttendance: 0,
    avgTimeIn: null,
    lateArrivals: 0,
    onTimeArrivals: 0,
  });
  const [dailyChart, setDailyChart] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (employees.length > 0) fetchAttendance();
  }, [startDate, endDate, employees]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("id, fullname");
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          employees (id, fullname)
        `)
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate)
        .order("attendance_date", { ascending: true });

      if (error) throw error;
      setAttendanceData(data || []);
      calculateStats(data || []);
      prepareDailyChart(data || []);
      prepareStatusDistribution(data || []);
    } catch (err) {
      console.error("Error fetching attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Determine time-in status (Late / On Time / Absent)
  const getTimeInStatus = (record) => {
    if (!record.time_in) return "Absent";
    const timeInHour = new Date(record.time_in).getHours();
    const timeInMin = new Date(record.time_in).getMinutes();
    const totalMinutes = timeInHour * 60 + timeInMin;
    const threshold = 8 * 60 + 30; // 08:30
    return totalMinutes > threshold ? "Late" : "On Time";
  };

  const calculateStats = (data) => {
    const totalEmployeesCount = employees.length;
    const totalAttendance = data.length;
    let late = 0, onTime = 0, totalMinutes = 0, timeInCount = 0;
    data.forEach(record => {
      if (record.time_in) {
        const timeInHour = new Date(record.time_in).getHours();
        const timeInMin = new Date(record.time_in).getMinutes();
        const totalMinutesSinceMidnight = timeInHour * 60 + timeInMin;
        const threshold = 8 * 60 + 30;
        if (totalMinutesSinceMidnight > threshold) late++;
        else onTime++;
        totalMinutes += totalMinutesSinceMidnight;
        timeInCount++;
      }
    });
    const avgMinutes = timeInCount > 0 ? totalMinutes / timeInCount : null;
    const avgTimeInStr = avgMinutes ? formatTimeFromMinutes(avgMinutes) : null;
    setStats({
      totalEmployees: totalEmployeesCount,
      totalAttendance: totalAttendance,
      avgTimeIn: avgTimeInStr,
      lateArrivals: late,
      onTimeArrivals: onTime,
    });
  };

  const formatTimeFromMinutes = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const prepareDailyChart = (data) => {
    const dailyMap = new Map();
    data.forEach(record => {
      const date = record.attendance_date;
      if (!dailyMap.has(date)) dailyMap.set(date, { date, count: 0 });
      dailyMap.get(date).count++;
    });
    const chartData = Array.from(dailyMap.values()).sort((a,b) => a.date.localeCompare(b.date)).slice(-7);
    setDailyChart(chartData);
  };

  const prepareStatusDistribution = (data) => {
    let present = 0;
    const uniqueDates = new Set(data.map(r => r.attendance_date));
    const totalPossible = employees.length * uniqueDates.size;
    present = data.filter(r => r.time_in).length;
    const absent = totalPossible - present;
    setStatusDistribution([
      { name: "Present", value: present, color: "#10b981" },
      { name: "Absent", value: absent > 0 ? absent : 0, color: "#ef4444" },
    ]);
  };

  const exportToCSV = () => {
    const headers = ["Date", "Employee", "Time In", "Time In Photo URL", "Time Out", "Time Out Photo URL", "Status", "Time In Status"];
    const rows = attendanceData.map(record => [
      record.attendance_date,
      record.employees?.fullname || "Unknown",
      record.time_in ? new Date(record.time_in).toLocaleTimeString() : "-",
      record.time_in_photo_url || "-",
      record.time_out ? new Date(record.time_out).toLocaleTimeString() : "-",
      record.time_out_photo_url || "-",
      record.time_in ? (record.time_out ? "Completed" : "Incomplete") : "Absent",
      getTimeInStatus(record),
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `attendance_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderPhoto = (url) => {
    if (!url) return <span className="text-gray-400 text-xs">No photo</span>;
    return (
      <img
        src={url}
        className="w-12 h-12 rounded-lg object-cover cursor-pointer border border-gray-300 hover:opacity-80 transition"
        onClick={() => window.open(url)}
        alt="attendance snapshot"
      />
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Attendance Reports with Face Logs</h1>
          <button
            onClick={exportToCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <button onClick={() => fetchAttendance()} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">Refresh</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard icon={<Users className="w-6 h-6 text-blue-600" />} title="Total Employees" value={stats.totalEmployees} color="blue" />
              <StatCard icon={<CheckCircle className="w-6 h-6 text-green-600" />} title="Total Attendance Records" value={stats.totalAttendance} color="green" />
              <StatCard icon={<Clock className="w-6 h-6 text-purple-600" />} title="Avg. Time In" value={stats.avgTimeIn || "—"} color="purple" />
              <StatCard icon={<AlertCircle className="w-6 h-6 text-red-600" />} title="Late Arrivals" value={stats.lateArrivals} color="red" />
              <StatCard icon={<Calendar className="w-6 h-6 text-teal-600" />} title="On Time" value={stats.onTimeArrivals} color="teal" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">Daily Attendance (Last 7 days)</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#3b82f6" name="Check-ins" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">Attendance Status</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%" cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Table with Time In Status Column */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Detailed Attendance Records (with Time In / Time Out Photos)</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In Photo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out Photo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Out</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time In Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceData.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-4 text-center text-gray-500">No records found</td>
                      </tr>
                    ) : (
                      attendanceData.map((record) => (
                        <tr key={record.id}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{record.attendance_date}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{record.employees?.fullname || "Unknown"}</td>
                          <td className="px-4 py-4 whitespace-nowrap">{renderPhoto(record.time_in_photo_url)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.time_in ? new Date(record.time_in).toLocaleTimeString() : "—"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">{renderPhoto(record.time_out_photo_url)}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.time_out ? new Date(record.time_out).toLocaleTimeString() : "—"}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.time_in && record.time_out ? "bg-green-100 text-green-800" :
                              record.time_in ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                            }`}>
                              {record.time_in && record.time_out ? "Completed" : record.time_in ? "Incomplete" : "Absent"}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              getTimeInStatus(record) === "Late" ? "bg-orange-100 text-orange-800" :
                              getTimeInStatus(record) === "On Time" ? "bg-green-100 text-green-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {getTimeInStatus(record)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function StatCard({ icon, title, value, color }) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    purple: "bg-purple-50 border-purple-200",
    red: "bg-red-50 border-red-200",
    teal: "bg-teal-50 border-teal-200",
  };
  return (
    <div className={`rounded-lg border p-4 flex items-center gap-4 ${colorMap[color]}`}>
      <div className="p-2 bg-white rounded-full shadow-sm">{icon}</div>
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}