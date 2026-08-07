const express = require("express");
const router = express.Router();

const {
  getPeriods,
  updatePeriods,
  getEntries,
  getTeacherAvailability,
  saveEntry,
  deleteEntry,
} = require("../controllers/timetablesController");

router.get("/periods", getPeriods);
router.put("/periods", updatePeriods);
router.get("/availability", getTeacherAvailability);
router.get("/entries", getEntries);
router.put("/entries", saveEntry);
router.delete("/entries/:id", deleteEntry);

module.exports = router;