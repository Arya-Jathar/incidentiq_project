const express = require("express");
const router = express.Router();
const {protect,authorize} = require("../middleware/auth");
const { getAllIncidents, createIncident,
    getIncidentById, updateIncident, deleteIncident} 
= require("../controllers/incidentController");

router.get("/", protect, getAllIncidents);
router.get("/:id", protect, getIncidentById);
router.patch("/:id", protect, updateIncident);
router.delete("/:id", protect, authorize("admin"), deleteIncident);
router.post("/", protect, createIncident);

module.exports = router;