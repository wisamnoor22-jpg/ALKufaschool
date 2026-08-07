import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import AppNavigationBar from "./components/common/AppNavigationBar";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import StudentsHome from "./pages/StudentsHome";
import Students from "./pages/students";
import StudentSections from "./pages/StudentSections";
import StudentProfile from "./pages/StudentProfile";
import Teachers from "./pages/Teachers";
import EmployeeProfile from "./pages/EmployeeProfile";
import Fees from "./pages/Fees";
import Attendance from "./pages/Attendance";
import Reports from "./pages/Reports";
import Results from "./pages/Results";
import DeletionArchive from "./pages/DeletionArchive";
import Payroll from "./pages/Payroll";
import Holidays from "./pages/Holidays";
import Timetables from "./pages/Timetables";
import "./App.css";
import "./styles/dataLists.css";

function App() {
  return (
    <Router>
      <div className="app-route-frame">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/students" element={<StudentsHome />} />
          <Route path="/students/registry" element={<Students />} />
          <Route path="/students/sections" element={<StudentSections />} />
          <Route path="/students/:studentId" element={<StudentProfile />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route
            path="/teachers/:employeeId"
            element={<EmployeeProfile />}
          />
          <Route path="/fees" element={<Fees />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/holidays" element={<Holidays />} />
          <Route path="/results" element={<Results />} />
          <Route path="/timetable" element={<Timetables />} />
          <Route path="/deletion-archive" element={<DeletionArchive />} />
        </Routes>
      </div>
      <AppNavigationBar />
    </Router>
  );
}

export default App;