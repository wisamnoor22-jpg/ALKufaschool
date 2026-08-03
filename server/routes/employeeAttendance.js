const express = require("express");
const router = express.Router();

const {
  getAttendanceByDate,
  saveBulkAttendance,
} = require("../controllers/employeeAttendanceController");

router.get("/", getAttendanceByDate);
router.post("/bulk", saveBulkAttendance);

module.exports = router;