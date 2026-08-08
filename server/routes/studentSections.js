const express = require("express");
const router = express.Router();

const {
  getStudentSections,
  initializeMorningSectionPlan,
  createStudentSection,
  renameStudentSection,
  deleteStudentSection,
  transferStudentsBetweenSections,
} = require("../controllers/studentSectionsController");

router.get("/", getStudentSections);
router.post("/initialize-plan", initializeMorningSectionPlan);
router.post("/transfer", transferStudentsBetweenSections);
router.post("/", createStudentSection);
router.put("/:id", renameStudentSection);
router.delete("/:id", deleteStudentSection);

module.exports = router;