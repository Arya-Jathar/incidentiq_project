const Postmortem = require("../models/Postmortem");

const getAllPostmortems = async (req, res) => {
    try {
        const postmortems = await Postmortem.find().populate("incident");
        res.json(postmortems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createPostmortem = async (req, res) => {
    try {
        const postmortem = await Postmortem.create(req.body);
        res.status(201).json(postmortem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getPostmortemById = async (req, res) => {
    try {
        const postmortem = await Postmortem.findById(req.params.id).populate("incident");
        if (!postmortem) {
            return res.status(404).json({ message: "Postmortem not found" });
        }
        res.json(postmortem);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updatePostmortem = async (req, res) => {
    try {
        const postmortem = await Postmortem.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!postmortem) {
            return res.status(404).json({ message: "Postmortem not found" });
        }
        res.json(postmortem);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deletePostmortem = async (req, res) => {
    try {
        const postmortem = await Postmortem.findByIdAndDelete(req.params.id);
        if (!postmortem) {
            return res.status(404).json({ message: "Postmortem not found" });
        }
        res.json({ message: "Postmortem deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAllPostmortems, createPostmortem, getPostmortemById, updatePostmortem, deletePostmortem };