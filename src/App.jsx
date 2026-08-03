import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/students";
import Teachers from "./pages/Teachers";
import EmployeeProfile from "./pages/EmployeeProfile";
import Fees from "./pages/Fees";

import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/teachers" element={<Teachers />} />

        <Route
          path="/teachers/:employeeId"
          element={<EmployeeProfile />}
        />

        <Route
          path="/fees"
          element={<Fees />}
        />
      </Routes>
    </Router>
  );
}

export default App;