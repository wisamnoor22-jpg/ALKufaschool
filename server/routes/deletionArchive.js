const express = require("express");

const {
  getArchiveItems,
  getArchiveCount,
  getArchiveItemById,
} = require("../controllers/deletionArchiveController");

const router = express.Router();

router.get("/", getArchiveItems);
router.get("/count", getArchiveCount);
router.get("/:id", getArchiveItemById);

module.exports = router;
