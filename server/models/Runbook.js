const mongoose = require("mongoose");

const runbookSchema = new mongoose.Schema(
    {
        title : {
            type: String,
            required: [true, "Title is required"],
            trim: true
        },
        service : {
            type: String,
            required: [true, "Service is required"],
            trim: true
        },
        severity : {
            type : String,
            enum : ["P0", "P1", "P2", "P3"],
        },
        steps :{
            type : [String],
            required: [true, "Steps are required"]
        },
        tags : {
            type : [String],
            default : []
        },
        createdBy : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User"
        },
        embedding: { type: [Number] }
    },
    {
        timestamps : true
    }
);

module.exports = mongoose.model("Runbook", runbookSchema);