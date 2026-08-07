const express = require("express");
const router = express.Router();

const {
  getStudentSections,
  initializeMorningSectionPlan,
  createStudentSection,
  renameStudentSection,
  transferStudentsBetweenSections,
} = require("../controllers/studentSectionsController");

router.get("/", getStudentSections);
router.post("/initialize-plan", initializeMorningSectionPlan);
router.post("/transfer", transferStudentsBetweenSections);
router.post("/", createStudentSection);
router.put("/:id", renameStudentSection);

module.exports = router;