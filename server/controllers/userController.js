const User = require("../models/User")

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (error) {
        res.status(500).json({message : error.message});
    }
};

const createUser = async (req,res) => {
    try {
        const users = await User.create(req.body);
        res.status(201).json(users);
    } catch (error) {
        res.status(400).json({message : error.message});
    }
};

const getUserById = async(req,res) => {
    try {
        const users = await User.findById(req.params.id).select("-password");
        if (!users) {
            return res.status(404).json({message : "User not found"});
        }
        res.json(users);
    } catch (error) {
        res.status(500).json({message : error.message});
    }
};

const updateUser = async(req,res) => {
    try {
        const users = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            {new : true, runValidators : true}
        ).select("-password");
        if(!users) {
            return res.status(404).json({message : "User not found"});
        }
        res.json(users);
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({message : error.message});
        }
        res.status(500).json({message : error.message});    
    }
};

const deleteUser = async(req, res) => {
    try {
        const users = await User.findByIdAndDelete(req.params.id);
        if(!users) {
            return res.status(404).json({message : "User not found"});
        }
        res.json({message : "User deleted"});
    } catch (error) {
        res.status(500).json({message : error.message});  
    }
};  

module.exports = { getAllUsers, createUser, getUserById, updateUser, deleteUser };