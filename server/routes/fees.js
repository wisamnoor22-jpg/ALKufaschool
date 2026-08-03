const express = require("express");
const router = express.Router();

const {
  getFees,
  addFee,
  addPayment,
  getPayments,
} = require("../controllers/feesController");

router.get("/", getFees);
router.post("/", addFee);

// الدفعات
router.get("/:feeId/payments", getPayments);
router.post("/:feeId/payments", addPayment);

module.exports = router;