const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
    getAllUsers,
    createUser,
    getUserById,
    updateUser,
    deleteUser
} = require("../controllers/userController");

router.get("/", protect, authorize("admin"), getAllUsers);
router.post("/", protect, authorize("admin"), createUser);
router.get("/:id", protect, getUserById);
router.patch("/:id", protect, updateUser);
router.delete("/:id", protect, authorize("admin"), deleteUser);

module.exports = router;