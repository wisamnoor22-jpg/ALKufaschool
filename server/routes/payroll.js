const express = require("express");

const { getPayroll } = require("../controllers/payrollController");

const router = express.Router();

router.get("/", getPayroll);

module.exports = router;
