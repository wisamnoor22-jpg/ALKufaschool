import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import AppNavigationBar from "./components/common/AppNavigationBar";

import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/students";
import StudentProfile from "./pages/StudentProfile";
import Teachers from "./pages/Teachers";
import EmployeeProfile from "./pages/EmployeeProfile";
import Fees from "./pages/Fees";
import Attendance from "./pages/Attendance";
import Reports from "./pages/Reports";
import Results from "./pages/Results";
import DeletionArchive from "./pages/DeletionArchive";

import "./App.css";
import "./styles/dataLists.css";

function App() {
  return (
    <Router>
      <AppNavigationBar />

      <div className="app-route-frame">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/students" element={<Students />} />
          <Route path="/students/:studentId" element={<StudentProfile />} />
          <Route path="/teachers" element={<Teachers />} />
          <Route
            path="/teachers/:employeeId"
            element={<EmployeeProfile />}
          />
          <Route path="/fees" element={<Fees />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/results" element={<Results />} />
          <Route path="/deletion-archive" element={<DeletionArchive />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
