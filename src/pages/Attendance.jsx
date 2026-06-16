import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { supabase } from "../services/supabase";

export default function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingRecord, setEditingRecord] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    time_in: "",
    time_out: ""
  });

  // Real-time clock - updates every second
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
    if (window.confirm("Delete this record?")) {
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

  const updateRecord = async (id, updates) => {
    const { error } = await supabase
      .from("attendance")
      .update(updates)
      .eq("id", id);
    
    if (!error) {
      fetchAttendance();
      return true;
    } else {
      alert("Error updating: " + error.message);
      return false;
    }
  };

  // Helper function to convert time string to ISO format with local time
  const convertToLocalISO = (dateStr, timeStr) => {
    if (!timeStr) return null;
    // Parse the time (format: "07:00")
    const [hours, minutes] = timeStr.split(':');
    // Create date object with local time
    const localDate = new Date(dateStr);
    localDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    // Convert to ISO string
    return localDate.toISOString();
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    
    // Extract time from ISO string correctly
    let timeInValue = "";
    let timeOutValue = "";
    
    if (record.time_in) {
      const date = new Date(record.time_in);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      timeInValue = `${hours}:${minutes}`;
    }
    
    if (record.time_out) {
      const date = new Date(record.time_out);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      timeOutValue = `${hours}:${minutes}`;
    }
    
    setEditForm({
      time_in: timeInValue,
      time_out: timeOutValue
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editingRecord) return;

    const updates = {};
    const today = editingRecord.attendance_date;
    
    if (editForm.time_in) {
      updates.time_in = convertToLocalISO(today, editForm.time_in);
    } else {
      updates.time_in = null;
    }
    
    if (editForm.time_out) {
      updates.time_out = convertToLocalISO(today, editForm.time_out);
    } else {
      updates.time_out = null;
    }

    await updateRecord(editingRecord.id, updates);
    setShowEditModal(false);
    setEditingRecord(null);
  };

  const getFilteredAttendance = () => {
    let filtered = attendance;
    if (filterDate) filtered = filtered.filter(record => record.attendance_date === filterDate);
    if (filterEmployee) filtered = filtered.filter(record => record.employee_id === filterEmployee);
    return filtered;
  };

  const exportToCSV = () => {
    const filtered = getFilteredAttendance();
    const csvData = filtered.map(record => ({
      'Employee': employees[record.employee_id] || 'Unknown',
      'Date': record.attendance_date,
      'Time In': record.time_in ? new Date(record.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      'Time Out': record.time_out ? new Date(record.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
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

  return (
    <Layout>
      {/* Minimal Header with Clock */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Attendance Records</h1>
          <p className="text-sm text-gray-500 mt-0.5">View and manage employee logs</p>
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

      {/* Filters */}
      <div className="bg-white border rounded-lg p-3 mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
            placeholder="Date"
          />
          
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="">All Employees</option>
            {Object.entries(employees).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          
          <button
            onClick={() => { setFilterDate(""); setFilterEmployee(""); }}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            Clear
          </button>
          
          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export CSV
          </button>
          
          <button
            onClick={fetchAttendance}
            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800"
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white border rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-lg font-semibold">{filteredAttendance.length}</div>
        </div>
        <div className="bg-white border rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500">Time In</div>
          <div className="text-lg font-semibold text-green-600">
            {filteredAttendance.filter(r => r.time_in).length}
          </div>
        </div>
        <div className="bg-white border rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500">Time Out</div>
          <div className="text-lg font-semibold text-blue-600">
            {filteredAttendance.filter(r => r.time_out).length}
          </div>
        </div>
        <div className="bg-white border rounded-lg px-3 py-2">
          <div className="text-xs text-gray-500">Completed</div>
          <div className="text-lg font-semibold text-purple-600">
            {filteredAttendance.filter(r => r.time_in && r.time_out).length}
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Employee</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Date</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Time In</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Time Out</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Hours</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="px-3 py-4 text-center text-gray-500">Loading...</td></tr>
              ) : filteredAttendance.length === 0 ? (
                <tr><td colSpan="6" className="px-3 py-4 text-center text-gray-500">No records</td></tr>
              ) : (
                filteredAttendance.map((record) => {
                  const timeIn = record.time_in ? new Date(record.time_in) : null;
                  const timeOut = record.time_out ? new Date(record.time_out) : null;
                  let hoursWorked = '-';
                  if (timeIn && timeOut) {
                    hoursWorked = ((timeOut - timeIn) / (1000 * 60 * 60)).toFixed(1);
                  }
                  
                  return (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2">{employees[record.employee_id] || "Unknown"}</td>
                      <td className="px-3 py-2 text-gray-600">{record.attendance_date}</td>
                      <td className="px-3 py-2">
                        {timeIn ? <span className="text-green-600">{timeIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {timeOut ? <span className="text-blue-600">{timeOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{hoursWorked}</td>
                      <td className="px-3 py-2 space-x-2">
                        <button
                          onClick={() => openEditModal(record)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Edit Attendance Record</h2>
              <p className="text-sm text-gray-500 mt-1">
                {employees[editingRecord.employee_id]} • {editingRecord.attendance_date}
              </p>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time In
                </label>
                <input
                  type="time"
                  value={editForm.time_in}
                  onChange={(e) => setEditForm({...editForm, time_in: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Format: HH:MM (24-hour)</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Out
                </label>
                <input
                  type="time"
                  value={editForm.time_out}
                  onChange={(e) => setEditForm({...editForm, time_out: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Format: HH:MM (24-hour)</p>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}