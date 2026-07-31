const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true
        },

        severity: {
            type: String,
            required: [true, "Severity is required"],
            enum: ["P0", "P1", "P2", "P3"]
        },

        status: {
            type: String,
            enum: ["open", "in-progress", "resolved"],
            default: "open"
        },

        affectedService: {
            type: String,
            required: [true, "Affected service is required"],
            trim: true
        },

        description: {
            type: String,
            trim: true
        },

        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        timeline: [
            {
                event: String,
                timestamp: {
                    type: Date,
                    default: Date.now
                }
            }
        ],

        agentOutput: {
            triage: String,
            rootCause: String,
            runbook: String,
            comms: String,
            postmortem: String
        },

        resolution: {
            type: String,
            enum: ["pending", "ai-accepted", "custom-resolved"],
            default: "pending"
        },

        customSolution: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);
incidentSchema.index({ severity: 1});
incidentSchema.index({ status : 1});
module.exports = mongoose.model("Incident", incidentSchema);