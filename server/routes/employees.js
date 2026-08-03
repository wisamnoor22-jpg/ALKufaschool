const express = require("express");
const router = express.Router();

const {
  getEmployees,
  getEmployeeById,
  addEmployee,
  deleteEmployee,
} = require("../controllers/employeesController");

const {
  uploadDocument,
  getDocuments,
  deleteDocument,
} = require("../controllers/employeeDocumentsController");

const upload = require("../middlewares/uploadEmployeeDocument");

router.get("/", getEmployees);
router.post("/", addEmployee);

router.get("/:employeeId/documents", getDocuments);

router.post(
  "/:employeeId/documents",
  upload.single("document"),
  uploadDocument
);

router.delete("/documents/:id", deleteDocument);

router.get("/:id", getEmployeeById);
router.delete("/:id", deleteEmployee);

module.exports = router;