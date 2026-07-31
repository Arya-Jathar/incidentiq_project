const Runbook = require("../models/Runbook");
const axios = require("axios");

const getAllRunbooks = async (req, res) => {
    try {
        const runbooks = await Runbook.find();
        res.json(runbooks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createRunbook = async (req, res) => {
    try {
        const { title, service, steps } = req.body;

        const embeddingText = `${service} - ${title}. Steps: ${(steps || []).join(", ")}`;

        let embedding = [];
        try {
            const embedResponse = await axios.post(`${process.env.AI_SERVICE_URL || "http://localhost:8000"}/embed`, {
                text: embeddingText
            });
            embedding = embedResponse.data.embedding;
        } catch (embedError) {
            console.log("Embedding generation failed:", embedError.message);
        }

        const runbook = await Runbook.create({ ...req.body, embedding });
        res.status(201).json(runbook);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getRunbookById = async (req, res) => {
    try {
        const runbook = await Runbook.findById(req.params.id);
        if (!runbook) {
            return res.status(404).json({ message: "Runbook not found" });
        }
        res.json(runbook);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateRunbook = async (req, res) => {
    try {
        const runbook = await Runbook.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!runbook) {
            return res.status(404).json({ message: "Runbook not found" });
        }
        res.json(runbook);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteRunbook = async (req, res) => {
    try {
        const runbook = await Runbook.findByIdAndDelete(req.params.id);
        if (!runbook) {
            return res.status(404).json({ message: "Runbook not found" });
        }
        res.json({ message: "Runbook deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAllRunbooks, createRunbook, getRunbookById, updateRunbook, deleteRunbook };