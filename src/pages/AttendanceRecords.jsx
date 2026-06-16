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
  User,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";

// Toast notification component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: "bg-green-50 border-green-500 text-green-800",
    error: "bg-red-50 border-red-500 text-red-800",
    warning: "bg-yellow-50 border-yellow-500 text-yellow-800",
    info: "bg-blue-50 border-blue-500 text-blue-800"
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    info: <AlertCircle className="w-5 h-5 text-blue-500" />
  };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-4 py-3 rounded-lg border-l-4 shadow-lg ${bgColors[type]} min-w-[300px] animate-slide-in`}>
      {icons[type]}
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Modern popup modal - visible with soft backdrop
const ConfirmModal = ({ isOpen, onClose, onConfirm, employeeName, recordDate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all animate-scale-up">
        <div className="p-6">
          <div className="flex items-center justify-center w-14 h-14 mx-auto bg-red-50 rounded-full">
            <Trash2 className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="mt-4 text-xl font-semibold text-center text-gray-900">Delete Attendance Record?</h3>
          <p className="mt-2 text-center text-gray-500">
            Are you sure you want to delete the record for
          </p>
          <p className="text-center font-medium text-gray-800 mt-1">
            {employeeName} · {recordDate}
          </p>
          <p className="mt-3 text-xs text-center text-red-400">
            This action cannot be undone.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-xl hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Notification state
  const [notification, setNotification] = useState(null);
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Show notification helper
  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
  };

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
    try {
      const { data, error } = await supabase.from("employees").select("id, fullname");
      if (error) throw error;
      if (data) {
        const empMap = {};
        data.forEach(emp => empMap[emp.id] = emp.fullname);
        setEmployees(empMap);
      }
    } catch (error) {
      showNotification("Failed to load employees: " + error.message, "error");
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .order("attendance_date", { ascending: false });
      
      if (error) throw error;
      if (data) {
        setAttendance(data);
        showNotification(`Loaded ${data.length} attendance records`, "success");
      }
    } catch (error) {
      showNotification("Failed to load attendance: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Open modal with record details
  const openDeleteModal = (record) => {
    setRecordToDelete(record);
    setModalOpen(true);
  };

  // Perform deletion after confirmation
  const confirmDelete = async () => {
    if (!recordToDelete) return;
    
    setModalOpen(false);
    try {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("id", recordToDelete.id);
      
      if (error) throw error;
      
      showNotification("Attendance record deleted successfully!", "success");
      await fetchAttendance();
    } catch (error) {
      showNotification("Error deleting record: " + error.message, "error");
    } finally {
      setRecordToDelete(null);
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
    
    if (filtered.length === 0) {
      showNotification("No data to export. Please adjust your filters.", "warning");
      return;
    }

    try {
      const csvData = filtered.map(record => ({
        'Employee': employees[record.employee_id] || 'Unknown',
        'Date': record.attendance_date,
        'Time In': record.time_in ? new Date(record.time_in).toLocaleTimeString() : '-',
        'Time Out': record.time_out ? new Date(record.time_out).toLocaleTimeString() : '-',
        'Hours': record.time_in && record.time_out ? 
          ((new Date(record.time_out) - new Date(record.time_in)) / (1000 * 60 * 60)).toFixed(1) : '-'
      }));

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
      
      showNotification(`Successfully exported ${filtered.length} records to CSV`, "success");
    } catch (error) {
      showNotification("Error exporting data: " + error.message, "error");
    }
  };

  const formatTimeWithSeconds = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const clearFilters = () => {
    setFilterDate("");
    setFilterEmployee("");
    setSearchTerm("");
    showNotification("All filters have been cleared", "info");
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
      {/* Modern Confirmation Modal */}
      <ConfirmModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setRecordToDelete(null);
        }}
        onConfirm={confirmDelete}
        employeeName={recordToDelete ? employees[recordToDelete.employee_id] || "Unknown" : ""}
        recordDate={recordToDelete ? recordToDelete.attendance_date : ""}
      />

      {/* Notification Toast */}
      {notification && (
        <Toast 
          message={notification.message} 
          type={notification.type} 
          onClose={() => setNotification(null)} 
        />
      )}

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
              onClick={clearFilters}
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
                          onClick={() => openDeleteModal(record)}
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

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleUp {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scale-up {
          animation: scaleUp 0.25s ease-out;
        }
      `}</style>
    </Layout>
  );
}