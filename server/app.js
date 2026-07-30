const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const mongoose = require("mongoose");

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.log("MongoDB connection error:", err.message);
    });

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

app.use((req,res,next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use("/api/incidents", require("./routes/incidents"));
app.use("/api/runbooks", require("./routes/runbooks"));
app.use("/api/postmortems", require("./routes/postmortems"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));

app.get("/", (req,res) => {
    res.json({ message : "IncidentIQ API is running"});
});

app.use(require("./middleware/errorHandler"));

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const axios = require("axios")
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    socket.on("run-pipeline", async(data) => {
        try {
            const response = await axios.post(`${process.env.AI_SERVICE_URL || "http://localhost:8000"}/run-pipeline`,{
                incident_description: data.incident_description
            });
            
            const result = response.data
            socket.emit("agent-update", { name: "Triage", result: `${result.severity} - ${result.affected_service}` });
            socket.emit("agent-update", { name: "Root Cause", result: result.root_cause });
            socket.emit("agent-update", { name: "Runbook", result: result.runbook_title });
            socket.emit("agent-update", { name: "Comms", result: result.comms_update });
            socket.emit("agent-update", { name: "Postmortem", result: result.fix_applied });

            socket.emit("pipeline-complete", result);
        } catch(error){
            console.log("Pipeline-error:", error.message);
            socket.emit("pipeline-error", {message: "Pipeline failed to run"});
        }
    });
    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});