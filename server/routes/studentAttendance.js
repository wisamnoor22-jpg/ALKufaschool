const express = require("express");
const router = express.Router();

const {
  getAttendanceByDate,
  getAttendanceReport,
  saveBulkAttendance,
} = require("../controllers/studentAttendanceController");

router.get("/report", getAttendanceReport);
router.get("/", getAttendanceByDate);
router.post("/bulk", saveBulkAttendance);

module.exports = router;