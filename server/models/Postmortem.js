const mongoose = require("mongoose");

const postmortemSchema = new mongoose.Schema(
    {
        incident : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Incident",
            required : true
        },
        rootCause : {
            type : String
        },
        timeline : {
            type : [String],
        },
        fixApplied : {
            type : String
        },
        preventionSteps : {
            type : [String]
        },
        generatedBy : {
            type : String,
            enum : ["ai", "manual"],
            default : "ai"
        }
    },
    {
        timestamps : true
    }
);

module.exports = mongoose.model("Postmortem", postmortemSchema);
