const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const mongoose = require("mongoose");
const Incident = require("./models/Incident");
const Postmortem = require("./models/Postmortem");

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

const axios = require("axios");

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("run-pipeline", async (data) => {
        try {
            const shortTitle = data.incident_description.split("\n")[0] || "Incident detected";

            // Step 1: Create incident IMMEDIATELY so frontend sees it right away
            const incident = await Incident.create({
                title: shortTitle,
                description: data.incident_description,
                severity: "P2",
                affectedService: "Analyzing...",
                status: "open",
                resolution: "pending"
            });

            io.emit("incident-created", {
                _id: incident._id,
                title: incident.title,
                severity: incident.severity,
                status: incident.status,
                createdAt: incident.createdAt
            });

            // Step 2: Run AI pipeline
            const response = await axios.post(
                `${process.env.AI_SERVICE_URL || "http://localhost:8000"}/run-pipeline`,
                { incident_description: data.incident_description }
            );

            const result = response.data;

            const noRunbook = !result.runbook_title ||
                result.runbook_title.toLowerCase().includes("no match") ||
                result.runbook_title.toLowerCase().includes("not found") ||
                result.runbook_title === "N/A";

            // Broadcast to ALL connected clients (browser + Python script)
            io.emit("agent-update", { name: "Triage", result: `${result.severity} — ${result.affected_service}` });
            io.emit("agent-update", { name: "Root Cause", result: result.root_cause });
            io.emit("agent-update", { name: "Runbook", result: noRunbook ? "⚠️ No matching runbook found" : result.runbook_title });
            io.emit("agent-update", { name: "Comms", result: result.comms_update });
            io.emit("agent-update", { name: "Postmortem", result: result.fix_applied });

            // Step 3: Update incident with AI results
            const validSeverities = ["P0", "P1", "P2", "P3"];
            const severity = validSeverities.includes(result.severity) ? result.severity : "P2";

            await Incident.findByIdAndUpdate(incident._id, {
                severity,
                affectedService: result.affected_service || "Unknown",
                agentOutput: {
                    triage: `${result.severity} — ${result.affected_service}`,
                    rootCause: result.root_cause,
                    runbook: result.runbook_title,
                    comms: result.comms_update,
                    postmortem: result.fix_applied
                }
            });

            // Step 4: Auto-save postmortem
            const preventionArr = Array.isArray(result.prevention_steps)
                ? result.prevention_steps
                : result.prevention_steps ? [result.prevention_steps] : [];

            const postmortem = await Postmortem.create({
                incident: incident._id,
                rootCause: result.root_cause,
                timeline: [data.incident_description],
                fixApplied: result.fix_applied,
                preventionSteps: preventionArr,
                generatedBy: "ai"
            });

            io.emit("pipeline-complete", {
                ...result,
                incidentId: incident._id,
                postmortemId: postmortem._id,
                noRunbook
            });

        } catch (error) {
            console.log("Pipeline-error:", error.message);
            io.emit("pipeline-error", { message: "Pipeline failed to run" });
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