const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
    getAllRunbooks,
    createRunbook,
    getRunbookById,
    updateRunbook,
    deleteRunbook
} = require("../controllers/runbookController");

router.get("/", protect, getAllRunbooks);
router.post("/", protect, authorize("admin", "engineer"), createRunbook);
router.get("/:id", protect, getRunbookById);
router.patch("/:id", protect, authorize("admin"), updateRunbook);
router.delete("/:id", protect, authorize("admin"), deleteRunbook);

module.exports = router;