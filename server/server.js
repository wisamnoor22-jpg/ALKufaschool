const express = require("express");
const cors = require("cors");
const path = require("path");
const feesRoutes = require("./routes/fees");
const gradeFeesRoutes = require("./routes/gradeFees");
require("dotenv").config();

const pool = require("./db");

const employeesRoutes = require("./routes/employees");
const studentsRoutes = require("./routes/students");

const app = express();

app.use(cors());
app.use(express.json());

// جعل مجلد uploads متاحًا من المتصفح
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

app.use("/students", studentsRoutes);
app.use("/employees", employeesRoutes);
app.use("/fees", feesRoutes);
app.use("/grade-fees", gradeFeesRoutes);

app.get("/", (req, res) => {
  res.send("Server is running");
});

pool
  .connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) =>
    console.error("Database connection error:", err)
  );

app.listen(5000, () => {
  console.log("Server started on port 5000");
});