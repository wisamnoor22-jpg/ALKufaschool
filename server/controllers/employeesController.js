const db = require("../db");

const generateEmployeeCode = async () => {
  const result = await db.query(
    "SELECT id FROM employees ORDER BY id DESC LIMIT 1"
  );

  const nextNumber =
    result.rows.length === 0 ? 1 : Number(result.rows[0].id) + 1;

  return `EMP-${String(nextNumber).padStart(4, "0")}`;
};

exports.getEmployees = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM employees ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء جلب الموظفين",
    });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "SELECT * FROM employees WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "الموظف غير موجود",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء جلب الموظف",
    });
  }
};

exports.addEmployee = async (req, res) => {
  try {
    const {
      full_name,
      phone,
      address,
      employee_type,
      salary,
      notes,
    } = req.body;

    if (!full_name?.trim() || !employee_type?.trim()) {
      return res.status(400).json({
        message: "اسم الموظف ونوع الموظف مطلوبان",
      });
    }

    const employeeCode = await generateEmployeeCode();

    const result = await db.query(
      `INSERT INTO employees
      (
        employee_code,
        full_name,
        phone,
        address,
        employee_type,
        salary,
        fingerprint_id,
        notes
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        employeeCode,
        full_name.trim(),
        phone || null,
        address || null,
        employee_type.trim(),
        salary || null,
        null,
        notes || null,
      ]
    );

    res.status(201).json({
      message: "تمت إضافة الموظف بنجاح",
      employee: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء إضافة الموظف",
    });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM employees WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "الموظف غير موجود",
      });
    }

    res.json({
      message: "تم حذف الموظف بنجاح",
      employee: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء حذف الموظف",
    });
  }
};