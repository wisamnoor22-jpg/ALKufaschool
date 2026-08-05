const express = require("express");

const {
  getDashboardStatistics,
} = require("../controllers/dashboardStatisticsController");

const router = express.Router();

router.get("/statistics", getDashboardStatistics);

module.exports = router;
