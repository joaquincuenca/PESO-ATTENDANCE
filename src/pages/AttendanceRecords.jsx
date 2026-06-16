import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { supabase } from "../services/supabase";
import { 
  Trash2, 
  Download, 
  RefreshCw, 
  Search,
  X,
  Clock,
  CheckCircle,
  Calendar,
  User
} from "lucide-react";

export default function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase.from("employees").select("id, fullname");
    if (data) {
      const empMap = {};
      data.forEach(emp => empMap[emp.id] = emp.fullname);
      setEmployees(empMap);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .order("attendance_date", { ascending: false });
    
    if (!error && data) {
      setAttendance(data);
    }
    setLoading(false);
  };

  const deleteRecord = async (id) => {
    if (window.confirm("Delete this attendance record?")) {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("id", id);
      
      if (!error) {
        fetchAttendance();
      } else {
        alert("Error: " + error.message);
      }
    }
  };

  const getFilteredAttendance = () => {
    let filtered = attendance;

    if (filterDate) {
      filtered = filtered.filter(record => record.attendance_date === filterDate);
    }

    if (filterEmployee) {
      filtered = filtered.filter(record => record.employee_id === filterEmployee);
    }

    if (searchTerm) {
      filtered = filtered.filter(record => {
        const empName = employees[record.employee_id] || "";
        return empName.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    return filtered;
  };

  const exportToCSV = () => {
    const filtered = getFilteredAttendance();
    
    const csvData = filtered.map(record => ({
      'Employee': employees[record.employee_id] || 'Unknown',
      'Date': record.attendance_date,
      'Time In': record.time_in ? new Date(record.time_in).toLocaleTimeString() : '-',
      'Time Out': record.time_out ? new Date(record.time_out).toLocaleTimeString() : '-',
      'Hours': record.time_in && record.time_out ? 
        ((new Date(record.time_out) - new Date(record.time_in)) / (1000 * 60 * 60)).toFixed(1) : '-'
    }));

    if (csvData.length === 0) {
      alert("No data to export");
      return;
    }

    const csvHeaders = Object.keys(csvData[0]).join(',');
    const csvRows = csvData.map(row => Object.values(row).join(','));
    const csvString = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatTimeWithSeconds = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const filteredAttendance = getFilteredAttendance();

  // Calculate stats
  const stats = {
    total: filteredAttendance.length,
    withTimeIn: filteredAttendance.filter(r => r.time_in).length,
    withTimeOut: filteredAttendance.filter(r => r.time_out).length,
    completed: filteredAttendance.filter(r => r.time_in && r.time_out).length
  };

  return (
    <Layout>
      {/* Header with Clock */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and manage employee attendance logs</p>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono text-gray-700 tracking-wider">
            {formatTimeWithSeconds(currentTime)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Time In</p>
              <p className="text-2xl font-bold text-green-600">{stats.withTimeIn}</p>
            </div>
            <Clock className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Time Out</p>
              <p className="text-2xl font-bold text-orange-600">{stats.withTimeOut}</p>
            </div>
            <Clock className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Completed</p>
              <p className="text-2xl font-bold text-purple-600">{stats.completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">Employee</label>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Employees</option>
              {Object.entries(employees).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by employee name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => { setFilterDate(""); setFilterEmployee(""); setSearchTerm(""); }}
              className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={fetchAttendance}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Employee</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Time In</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Time Out</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Hours Worked</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                    Loading...
                  </td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record) => {
                  const timeIn = record.time_in ? new Date(record.time_in) : null;
                  const timeOut = record.time_out ? new Date(record.time_out) : null;
                  let hoursWorked = '-';
                  if (timeIn && timeOut) {
                    hoursWorked = ((timeOut - timeIn) / (1000 * 60 * 60)).toFixed(1);
                  }
                  
                  return (
                    <tr key={record.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{employees[record.employee_id] || "Unknown"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{record.attendance_date}</td>
                      <td className="px-4 py-3">
                        {timeIn ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            {timeIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {timeOut ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            {timeOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{hoursWorked}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer */}
        <div className="bg-gray-50 px-4 py-3 border-t">
          <div className="text-sm text-gray-600">
            Showing {filteredAttendance.length} of {attendance.length} records
          </div>
        </div>
      </div>
    </Layout>
  );
}