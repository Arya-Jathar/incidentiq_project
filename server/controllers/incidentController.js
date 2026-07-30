const Incident = require("../models/Incident");

const getAllIncidents = async (req,res) => {
    try{
        const incidents = await Incident.find().populate("assignedTo", "name email");
        res.json(incidents);
    } catch(error) {
        res.status(500).json({message: error.message });
    }
};

const createIncident = async(req, res) => {
    try {
        const incident = await Incident.create(req.body);
        res.status(201).json(incident);
    } catch(error) {
        res.status(400).json({message: error.message});
    }
};

const getIncidentById = async(req,res) => {
    try {
        const incident = await Incident.findById(req.params.id).populate("assignedTo","name email");
        if (!incident) {
            return res.status(404).json({ message: "Incident not found"});
        }
        res.json(incident);
    } catch(error) {
        res.status(500).json({message: error.message});
    }
};

const updateIncident = async(req,res) => {
    try {
        const incident = await Incident.findByIdAndUpdate(
            req.params.id,
            req.body,
            {new : true, runValidators: true}
        );
        if (!incident){
            return res.status(404).json({message: "Incident not found" });
        }
        res.json(incident);
    } catch(error) {
        res.status(400).json({message: error.message});
    }
};

const deleteIncident = async(req,res) => {
    try {
        const incident = await Incident.findByIdAndDelete(req.params.id);
        if (!incident) {
            return res.status(404).json({message: "Incident not found"});
        }
        res.json({message: "Incident deleted"});
    } catch(error) {
        res.status(500).json({message: error.message}); 
    }
}
module.exports = { getAllIncidents, createIncident, getIncidentById, updateIncident, deleteIncident };