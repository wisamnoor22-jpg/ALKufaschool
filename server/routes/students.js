const express = require("express");
const router = express.Router();

const {
  addStudent,
  getStudents,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentsController");

router.get("/", getStudents);

router.post("/", addStudent);

router.put("/:id", updateStudent);

router.delete("/:id", deleteStudent);

module.exports = router;