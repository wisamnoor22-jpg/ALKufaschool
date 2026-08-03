const express = require("express");
const router = express.Router();

const {
  getAttendanceByDate,
  getAttendanceReport,
  saveBulkAttendance,
} = require("../controllers/employeeAttendanceController");

router.get("/report", getAttendanceReport);
router.get("/", getAttendanceByDate);
router.post("/bulk", saveBulkAttendance);

module.exports = router;