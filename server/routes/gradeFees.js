const express = require("express");
const router = express.Router();

const {
  getGradeFees,
  addGradeFee,
  updateGradeFee,
  deleteGradeFee,
} = require("../controllers/gradeFeesController");

router.get("/", getGradeFees);
router.post("/", addGradeFee);
router.put("/:id", updateGradeFee);
router.delete("/:id", deleteGradeFee);

module.exports = router;