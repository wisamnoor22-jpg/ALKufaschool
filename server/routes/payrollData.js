const express = require("express");
const router = express.Router();
const { getPayrollData } = require("../controllers/payrollDataController");

router.get("/", getPayrollData);

module.exports = router;