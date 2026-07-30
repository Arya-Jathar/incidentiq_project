const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
    getAllPostmortems,
    createPostmortem,
    getPostmortemById,
    updatePostmortem,
    deletePostmortem
} = require("../controllers/postmortemController");

router.get("/", protect, getAllPostmortems);
router.post("/", protect, createPostmortem);
router.get("/:id", protect, getPostmortemById);
router.patch("/:id", protect, updatePostmortem);
router.delete("/:id", protect, deletePostmortem);

module.exports = router;