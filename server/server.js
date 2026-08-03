const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const pool = require("./db");

const employeesRoutes = require("./routes/employees");
const studentsRoutes = require("./routes/students");
const feesRoutes = require("./routes/fees");
const gradeFeesRoutes = require("./routes/gradeFees");
const studentAttendanceRoutes = require("./routes/studentAttendance");

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

app.use("/students", studentsRoutes);
app.use("/employees", employeesRoutes);
app.use("/fees", feesRoutes);
app.use("/grade-fees", gradeFeesRoutes);
app.use("/student-attendance", studentAttendanceRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "AlKufa School server is running",
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: "المسار المطلوب غير موجود",
  });
});

app.use((error, req, res, next) => {
  console.error("Unhandled server error:", error);

  res.status(error.statusCode || 500).json({
    message:
      error.statusCode && error.message
        ? error.message
        : "حدث خطأ داخلي في الخادم",
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down...`);

  server.close(async () => {
    try {
      await pool.end();
      console.log("PostgreSQL pool closed");
      process.exit(0);
    } catch (error) {
      console.error("Shutdown error:", error);
      process.exit(1);
    }
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));