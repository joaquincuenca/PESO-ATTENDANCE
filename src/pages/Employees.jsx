import {
  Briefcase,
  Building2,
  Calendar,
  Camera,
  IdCard,
  Loader2,
  Search,
  Trash2,
  User,
  UserPlus,
  Users,
  Venus,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  MapPin
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "../components/Layout";
import { supabase } from "../services/supabase";

export default function Employees() {
  const navigate = useNavigate();
  const location = useLocation();
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Notification state
  const [notification, setNotification] = useState(null);

  // Delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState({ id: null, name: "" });

  // For employee details modal
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [form, setForm] = useState({
    employee_id: "",
    first_name: "",
    middle_name: "",
    last_name: "",
    age: "",
    gender: "",
    department: "",
    position: "",
    birthdate: "",
    email: "",
    phone: "",
    address: ""
  });

  const departments = [
    "Technical Section",
    "Finance Section",
    "Administrative Section",
    "Sustainable Livelihood Program (SLP)",
    "Department of Social Welfare and Development (DSWD)",
    "Government Internship Program (GIP)",
    "On the Job Training (OJT)",
    "Special Program for Employment of Students (SPES)",
    "PESO - Manager"
  ];

  const genders = ["Male", "Female", "Other"];

  // Helper to show notifications
  const showSuccess = (message) => {
    setNotification({ type: "success", message });
    setTimeout(() => setNotification(null), 5000);
  };

  const showError = (message) => {
    setNotification({ type: "error", message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Real-time capitalization
  const capitalizeWords = (str) => {
    if (!str) return str;
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleCapitalizedChange = (field) => (e) => {
    const raw = e.target.value;
    const capitalized = capitalizeWords(raw);
    setForm(prev => ({ ...prev, [field]: capitalized }));
  };

  // Auto-calculate age from birthdate
  const calculateAge = (birthdateStr) => {
    if (!birthdateStr) return "";
    const birthDate = new Date(birthdateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 0 || isNaN(age)) return "";
    return age.toString();
  };

  const handleBirthdateChange = (e) => {
    const birthdate = e.target.value;
    setForm(prev => ({ ...prev, birthdate }));
    const age = calculateAge(birthdate);
    setForm(prev => ({ ...prev, age }));
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setEmployees(data);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Listen for face registration result from navigation state (fixed without TypeScript)
  useEffect(() => {
    const state = location.state;
    if (state?.faceRegistrationSuccess) {
      const name = state.employeeName || "employee";
      showSuccess(`Face registered successfully for ${name}`);
      // Clear state to prevent showing again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    } else if (state?.faceRegistrationError) {
      showError(`Face registration failed: ${state.faceRegistrationError}`);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const addEmployee = async (e) => {
    e.preventDefault();
    let fullname = form.first_name;
    if (form.middle_name) fullname += ` ${form.middle_name}`;
    fullname += ` ${form.last_name}`;

    const employeeData = {
      employee_id: form.employee_id,
      fullname: fullname.trim(),
      first_name: form.first_name,
      middle_name: form.middle_name,
      last_name: form.last_name,
      age: form.age ? parseInt(form.age) : null,
      gender: form.gender,
      department: form.department,
      position: form.position,
      birthdate: form.birthdate || null,
      email: form.email || null,
      phone: form.phone || null,
      address: form.address || null
    };

    const { error } = await supabase.from("employees").insert([employeeData]);
    if (!error) {
      showSuccess("Employee added successfully!");
      setForm({
        employee_id: "", first_name: "", middle_name: "", last_name: "",
        age: "", gender: "", department: "", position: "", birthdate: "",
        email: "", phone: "", address: ""
      });
      setShowForm(false);
      fetchEmployees();
    } else {
      showError("Error adding employee: " + error.message);
    }
  };

  // Open delete confirmation modal
  const confirmDelete = (id, fullname) => {
    setEmployeeToDelete({ id, name: fullname });
    setShowDeleteConfirm(true);
  };

  // Perform deletion after confirmation
  const performDelete = async () => {
    const { id, name } = employeeToDelete;
    setDeletingId(id);
    setShowDeleteConfirm(false);

    try {
      const { error: attendanceError } = await supabase
        .from("attendance")
        .delete()
        .eq("employee_id", id);

      if (attendanceError) throw new Error("Failed to delete attendance: " + attendanceError.message);

      const { error: employeeError } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);

      if (employeeError) throw new Error("Failed to delete employee: " + employeeError.message);

      showSuccess(`"${name}" and all their attendance records deleted successfully!`);
      fetchEmployees();
    } catch (err) {
      showError(err.message);
    } finally {
      setDeletingId(null);
      setEmployeeToDelete({ id: null, name: "" });
    }
  };

  const handleRegisterFace = (empId) => {
    setLoadingRegister(empId);
    setTimeout(() => {
      navigate(`/register-face?id=${empId}`);
    }, 100);
  };

  const fetchEmployeeAttendance = async (employeeId) => {
    setLoadingAttendance(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeId)
        .order("attendance_date", { ascending: false });
      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (err) {
      console.error(err);
      showError("Failed to load attendance records");
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleEmployeeClick = async (employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
    await fetchEmployeeAttendance(employee.id);
  };

  const renderPhoto = (url) => {
    if (!url) return <span className="text-gray-400 text-xs">—</span>;
    return (
      <img
        src={url}
        className="w-10 h-10 rounded-lg object-cover cursor-pointer border border-gray-300 hover:opacity-80"
        onClick={(e) => { e.stopPropagation(); window.open(url); }}
        alt="attendance snapshot"
      />
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  const filteredEmployees = employees.filter(emp =>
    emp.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.middle_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.gender?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.phone?.includes(searchTerm)
  );

  const stats = {
    total: employees.length,
    withFace: employees.filter(emp => emp.face_descriptor).length,
    withoutFace: employees.filter(emp => !emp.face_descriptor).length,
    departments: [...new Set(employees.map(emp => emp.department).filter(Boolean))].length
  };

  return (
    <Layout>
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
          <div className={`rounded-lg shadow-lg p-4 flex items-center gap-3 ${
            notification.type === "success" ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"
          }`}>
            {notification.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Confirm Delete</h2>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to delete <span className="font-semibold">{employeeToDelete.name}</span>?
              </p>
              <p className="text-sm text-red-600 mt-2">
                ⚠️ This will also delete ALL their attendance records. This action cannot be undone.
              </p>
            </div>
            <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={performDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with Stats */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage employee records and face registration</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>{showForm ? "Cancel" : "Add Employee"}</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white border rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-xl font-bold text-gray-900">{stats.total}</div>
              </div>
              <Users className="w-6 h-6 text-blue-500 opacity-50" />
            </div>
          </div>
          <div className="bg-white border rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Face Registered</div>
                <div className="text-xl font-bold text-green-600">{stats.withFace}</div>
              </div>
              <Camera className="w-6 h-6 text-green-500 opacity-50" />
            </div>
          </div>
          <div className="bg-white border rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Pending</div>
                <div className="text-xl font-bold text-orange-600">{stats.withoutFace}</div>
              </div>
              <UserPlus className="w-6 h-6 text-orange-500 opacity-50" />
            </div>
          </div>
          <div className="bg-white border rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Departments</div>
                <div className="text-xl font-bold text-purple-600">{stats.departments}</div>
              </div>
              <Building2 className="w-6 h-6 text-purple-500 opacity-50" />
            </div>
          </div>
        </div>
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add New Employee</h2>
                <p className="text-sm text-gray-500 mt-0.5">Fill in the details below</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={addEmployee} className="p-6 space-y-6">
              {/* Employee ID */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                <div className="relative group">
                  <IdCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="e.g., EMP-001"
                    className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={form.employee_id}
                    onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500" />
                    <input
                      type="text"
                      placeholder="Juan"
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={form.first_name}
                      onChange={handleCapitalizedChange("first_name")}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Middle Name</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500" />
                    <input
                      type="text"
                      placeholder="Santos"
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={form.middle_name}
                      onChange={handleCapitalizedChange("middle_name")}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500" />
                    <input
                      type="text"
                      placeholder="Dela Cruz"
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={form.last_name}
                      onChange={handleCapitalizedChange("last_name")}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Birthdate & Auto Age */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Birthdate</label>
                  <div className="relative group">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500" />
                    <input
                      type="date"
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={form.birthdate}
                      onChange={handleBirthdateChange}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Age (auto)</label>
                  <div className="relative group">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm bg-gray-50 text-gray-600"
                      value={form.age}
                      readOnly
                      disabled
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <div className="relative group">
                    <Venus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500" />
                    <select
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none bg-white"
                      value={form.gender}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      required
                    >
                      <option value="">Select Gender</option>
                      {genders.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Department & Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <div className="relative group">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500" />
                    <select
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none bg-white"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <div className="relative group">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500" />
                    <input
                      type="text"
                      placeholder="e.g., Staff / Officer / Coordinator"
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      value={form.position}
                      onChange={handleCapitalizedChange("position")}
                    />
                  </div>
                </div>
              </div>

              {/* Email, Phone, Address */}
              <div className="space-y-4 border-t border-gray-100 pt-4">
                <h3 className="text-md font-medium text-gray-800">Contact Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500" />
                      <input
                        type="email"
                        placeholder="juan.delacruz@example.com"
                        className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <div className="relative group">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500" />
                      <input
                        type="tel"
                        placeholder="+63 912 345 6789"
                        className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <div className="relative group">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400 group-focus-within:text-blue-500" />
                    <textarea
                      placeholder="Street, City, Province, Postal Code"
                      rows="2"
                      className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                      value={form.address}
                      onChange={handleCapitalizedChange("address")}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-sm transition-all"
                >
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, department, position, gender, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border rounded-lg pl-10 pr-4 py-2 text-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">Employee ID</th>
                <th className="px-4 py-3 text-left">Full Name</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Position</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Face Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-500">No employees found</td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleEmployeeClick(emp)}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{emp.employee_id}</td>
                    <td className="px-4 py-3 font-medium">{emp.fullname}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.department || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.position || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">{emp.email || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.phone || "-"}</td>
                    <td className="px-4 py-3">
                      {emp.face_descriptor ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Camera className="w-3 h-3 mr-1" />Registered
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <UserPlus className="w-3 h-3 mr-1" />Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRegisterFace(emp.id)}
                          disabled={loadingRegister === emp.id}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                          {loadingRegister === emp.id ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Loading...</>
                          ) : (
                            <><Camera className="w-3 h-3 mr-1" /> Register Face</>
                          )}
                        </button>
                        <button
                          onClick={() => confirmDelete(emp.id, emp.fullname)}
                          disabled={deletingId === emp.id}
                          className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          {deletingId === emp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Trash2 className="w-3 h-3 mr-1" /> Delete</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-4 py-3 border-t text-sm text-gray-600">
          Showing {filteredEmployees.length} of {employees.length} employees
        </div>
      </div>

      {/* Employee Details Modal */}
      {showDetailsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Employee Details</h2>
                <p className="text-sm text-gray-500 mt-0.5">Personal information and attendance history</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Info Card */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2 text-blue-500" /> Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div><span className="text-gray-500">Employee ID:</span> <span className="font-mono">{selectedEmployee.employee_id}</span></div>
                  <div><span className="text-gray-500">Full Name:</span> <span className="font-medium">{selectedEmployee.fullname}</span></div>
                  <div><span className="text-gray-500">Birthdate:</span> {formatDate(selectedEmployee.birthdate)}</div>
                  <div><span className="text-gray-500">Age:</span> {selectedEmployee.age}</div>
                  <div><span className="text-gray-500">Gender:</span> {selectedEmployee.gender}</div>
                  <div><span className="text-gray-500">Department:</span> {selectedEmployee.department || "-"}</div>
                  <div><span className="text-gray-500">Position:</span> {selectedEmployee.position || "-"}</div>
                  <div><span className="text-gray-500">Email:</span> {selectedEmployee.email || "-"}</div>
                  <div><span className="text-gray-500">Phone:</span> {selectedEmployee.phone || "-"}</div>
                  <div className="col-span-2"><span className="text-gray-500">Address:</span> {selectedEmployee.address || "-"}</div>
                  <div>
                    <span className="text-gray-500">Face Registration:</span>{" "}
                    {selectedEmployee.face_descriptor ? (
                      <span className="inline-flex items-center text-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Registered</span>
                    ) : (
                      <span className="inline-flex items-center text-orange-700"><AlertCircle className="w-3 h-3 mr-1" /> Not registered</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance History */}
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-blue-500" /> Attendance History
                </h3>
                {loadingAttendance ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
                ) : attendanceRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">No attendance records found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded-lg">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left">Date</th>
                          <th className="px-4 py-2 text-left">Time In Photo</th>
                          <th className="px-4 py-2 text-left">Time In</th>
                          <th className="px-4 py-2 text-left">Time Out Photo</th>
                          <th className="px-4 py-2 text-left">Time Out</th>
                          <th className="px-4 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRecords.map(record => (
                          <tr key={record.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-2">{record.attendance_date}</td>
                            <td className="px-4 py-2">{renderPhoto(record.time_in_photo_url)}</td>
                            <td className="px-4 py-2">{record.time_in ? new Date(record.time_in).toLocaleTimeString() : "—"}</td>
                            <td className="px-4 py-2">{renderPhoto(record.time_out_photo_url)}</td>
                            <td className="px-4 py-2">{record.time_out ? new Date(record.time_out).toLocaleTimeString() : "—"}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                record.time_in && record.time_out ? "bg-green-100 text-green-800" :
                                record.time_in ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                              }`}>
                                {record.time_in && record.time_out ? "Completed" :
                                record.time_in ? "Incomplete" : "Absent"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white/95 border-t border-gray-100 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}