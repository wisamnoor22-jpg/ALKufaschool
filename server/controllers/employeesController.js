const db = require("../db");
const {
  createDeletionArchive,
} = require("../services/deletionArchiveService");

const EMPLOYEE_DELETE_REASONS = {
  resignation: "استقالة.",
  termination: "إنهاء خدمة.",
  transfer: "نقل.",
  retirement: "تقاعد.",
  other: "سبب آخر.",
};

const ALLOWED_EMPLOYEE_TYPES = new Set([
  "معلمة",
  "المدير",
  "المعاون",
  "مسؤول الحسابات",
  "موظف الاستعلامات",
]);

const ALLOWED_WORK_SHIFTS = new Set([
  "صباحي",
  "ظهري",
  "صباحي وظهري",
]);

const PHONE_PATTERN = /^[0-9٠-٩+()\-\s./]{7,20}$/;

const normalizeText = (value) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const validateEmployeePayload = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { error: "بيانات الموظف غير صحيحة" };
  }

  const firstName = normalizeText(payload.first_name);
  const middleName = normalizeText(payload.middle_name);
  const thirdName = normalizeText(payload.third_name);
  const employeeType = normalizeText(payload.employee_type);
  const phone = normalizeText(payload.phone);
  const address = normalizeText(payload.address);
  const workShift = normalizeText(payload.work_shift);
  const notes = normalizeText(payload.notes);
  const requestedSpecialization = normalizeText(payload.specialization);

  if (!firstName || !middleName || !thirdName) {
    return { error: "الاسم الأول والثاني والثالث مطلوبة" };
  }

  if (
    firstName.length > 100 ||
    middleName.length > 100 ||
    thirdName.length > 150
  ) {
    return { error: "أحد أجزاء اسم الموظف أطول من الحد المسموح" };
  }

  const fullName = [firstName, middleName, thirdName].join(" ");

  if (fullName.length > 150) {
    return { error: "الاسم الثلاثي يجب ألا يتجاوز 150 حرفًا" };
  }

  if (!ALLOWED_EMPLOYEE_TYPES.has(employeeType)) {
    return { error: "نوع الموظف غير معتمد" };
  }

  if (!ALLOWED_WORK_SHIFTS.has(workShift)) {
    return { error: "الشفت غير معتمد" };
  }

  const phoneDigitCount = (phone.match(/[0-9٠-٩]/g) || []).length;

  if (phone && (!PHONE_PATTERN.test(phone) || phoneDigitCount < 7)) {
    return {
      error:
        "رقم الهاتف غير صحيح؛ استخدم أرقامًا مع + أو مسافات أو شرطات عند الحاجة",
    };
  }

  const salaryIsEmpty =
    payload.salary === "" ||
    payload.salary === null ||
    payload.salary === undefined;
  const salary = salaryIsEmpty ? null : Number(payload.salary);

  if (!salaryIsEmpty && (!Number.isFinite(salary) || salary < 0)) {
    return { error: "الراتب يجب أن يكون رقمًا غير سالب" };
  }

  if (requestedSpecialization.length > 100) {
    return { error: "الاختصاص يجب ألا يتجاوز 100 حرف" };
  }

  if (employeeType === "معلمة" && !requestedSpecialization) {
    return { error: "اختصاص المعلمة مطلوب" };
  }

  return {
    value: {
      first_name: firstName,
      middle_name: middleName,
      third_name: thirdName,
      full_name: fullName,
      employee_type: employeeType,
      specialization:
        employeeType === "معلمة" ? requestedSpecialization : null,
      salary,
      address: address || null,
      phone: phone || null,
      work_shift: workShift,
      notes: notes || null,
    },
  };
};

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
    const validation = validateEmployeePayload(req.body);

    if (validation.error) {
      return res.status(400).json({
        message: validation.error,
      });
    }

    const employee = validation.value;
    const employeeCode = await generateEmployeeCode();

    const result = await db.query(
      `INSERT INTO employees
      (
        employee_code,
        first_name,
        middle_name,
        third_name,
        full_name,
        phone,
        address,
        employee_type,
        specialization,
        salary,
        work_shift,
        fingerprint_id,
        notes
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        employeeCode,
        employee.first_name,
        employee.middle_name,
        employee.third_name,
        employee.full_name,
        employee.phone,
        employee.address,
        employee.employee_type,
        employee.specialization,
        employee.salary,
        employee.work_shift,
        null,
        employee.notes,
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
  const client = await db.connect();

  try {
    const id = Number(req.params.id);
    const requestBody =
      req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? req.body
        : {};
    const reasonCode =
      typeof requestBody.reason_code === "string"
        ? requestBody.reason_code.trim()
        : "";
    const reasonDetails =
      typeof requestBody.reason_details === "string"
        ? requestBody.reason_details.trim()
        : "";

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "رقم الموظف غير صحيح",
      });
    }

    if (!Object.hasOwn(EMPLOYEE_DELETE_REASONS, reasonCode)) {
      return res.status(400).json({
        message: "يرجى تحديد سبب حذف الموظف",
      });
    }

    if (reasonCode === "other" && !reasonDetails) {
      return res.status(400).json({
        message: "يرجى كتابة سبب حذف الموظف",
      });
    }

    if (reasonDetails.length > 500) {
      return res.status(400).json({
        message: "سبب حذف الموظف يجب ألا يتجاوز 500 حرف",
      });
    }

    await client.query("BEGIN");

    const employeeResult = await client.query(
      "SELECT * FROM employees WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (employeeResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "الموظف غير موجود",
      });
    }

    const attendanceResult = await client.query(
      `SELECT *
       FROM employee_attendance
       WHERE employee_id = $1
       ORDER BY attendance_date, id
       FOR UPDATE`,
      [id]
    );

    const documentsResult = await client.query(
      `SELECT *
       FROM employee_documents
       WHERE employee_id = $1
       ORDER BY uploaded_at, id
       FOR UPDATE`,
      [id]
    );

    const archiveRecord = await createDeletionArchive(client, {
      entityType: "employee",
      entityId: id,
      entityName: employeeResult.rows[0].full_name,
      deletionReason:
        reasonCode === "other"
          ? reasonDetails
          : EMPLOYEE_DELETE_REASONS[reasonCode],
      snapshotData: {
        employee: employeeResult.rows[0],
        employee_attendance: attendanceResult.rows,
        employee_documents: documentsResult.rows,
      },
      metadata: {
        schema_version: 1,
        reason_code: reasonCode,
        source: "employee_deletion",
        related_counts: {
          employee_attendance: attendanceResult.rowCount,
          employee_documents: documentsResult.rowCount,
        },
        document_files_retained: true,
      },
    });

    const deletedDocuments = await client.query(
      "DELETE FROM employee_documents WHERE employee_id = $1",
      [id]
    );

    const deletedAttendance = await client.query(
      "DELETE FROM employee_attendance WHERE employee_id = $1",
      [id]
    );

    const result = await client.query(
      "DELETE FROM employees WHERE id = $1 RETURNING *",
      [id]
    );

    await client.query("COMMIT");

    res.json({
      message: "تم حذف الموظف وأرشفة بياناته بنجاح",
      employee: result.rows[0],
      deletion_reason: {
        code: reasonCode,
        details: reasonCode === "other" ? reasonDetails : "",
        archive_id: archiveRecord.id,
      },
      deleted_records: {
        employee_attendance: deletedAttendance.rowCount,
        employee_documents: deletedDocuments.rowCount,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);

    res.status(500).json({
      message: "حدث خطأ أثناء حذف الموظف",
    });
  } finally {
    client.release();
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        message: "رقم الموظف غير صحيح",
      });
    }

    const validation = validateEmployeePayload(req.body);

    if (validation.error) {
      return res.status(400).json({
        message: validation.error,
      });
    }

    const employee = validation.value;
    const result = await db.query(
      `UPDATE employees
       SET first_name = $1,
           middle_name = $2,
           third_name = $3,
           full_name = $4,
           phone = $5,
           address = $6,
           employee_type = $7,
           specialization = $8,
           salary = $9,
           work_shift = $10,
           notes = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING *`,
      [
        employee.first_name,
        employee.middle_name,
        employee.third_name,
        employee.full_name,
        employee.phone,
        employee.address,
        employee.employee_type,
        employee.specialization,
        employee.salary,
        employee.work_shift,
        employee.notes,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "الموظف غير موجود",
      });
    }

    return res.json({
      message: "تم تعديل بيانات الموظف بنجاح",
      employee: result.rows[0],
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تعديل الموظف",
    });
  }
};

exports.validateEmployeePayload = validateEmployeePayload;
exports.ALLOWED_EMPLOYEE_TYPES = ALLOWED_EMPLOYEE_TYPES;
exports.ALLOWED_WORK_SHIFTS = ALLOWED_WORK_SHIFTS;
