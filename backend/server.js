import express from "express";
import cors from "cors";
import {WebSocketServer} from "ws";
import { executeJavaScriptInDocker, executePythonInDocker } from "./services/dockerExecutor.js";
import { executeCInDocker , executeCppInDocker , executeJavaInDocker} from "./services/compiledExecutor.js";  
import { startInteractiveContainer, sendInput ,closeInput,
  stopInteractiveContainer
} from "./services/interactiveExecutor.js";


const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Online Compiler Backend is running!"
  });
});

// Execute Code
app.post("/api/execute", async (req, res) => {
  const { language, code, input = "" } = req.body;

  console.log("Incoming request:", {
    language,
    code,
    input
  });

  // Validate language
  if (!language) {
    return res.status(400).json({
      success: false,
      status: "error",
      output: "",
      error: "Language is required"
    });
  }

  // Validate code
  if (!code || !code.trim()) {
    return res.status(400).json({
      success: false,
      status: "error",
      output: "",
      error: "Code is required"
    });
  }

  // JavaScript - Docker
  if (language === "javascript") {
    console.log("🐳 JavaScript Docker executor started");

    const result = await executeJavaScriptInDocker(code, input);

    console.log("Execution result:", result);

    return res.json({
      success: result.status === "success",
      status: result.status,
      output: result.output,
      error: result.error
    });
  }
  //Python-docker
  if (language === "python") {
  //console.log("🐍 Python Docker executor started");

  const result = await executePythonInDocker(code, input);

  console.log("Execution result:", result);

  return res.json({
    success: result.status === "success",
    status: result.status,
    output: result.output,
    error: result.error
  });
}
if (language === "c") {
  console.log("🔵 C Docker executor started");

  const result = await executeCInDocker(code, input);

  return res.json({
    success: result.status === "success",
    status: result.status,
    output: result.output,
    error: result.error
  });
}

if (language === "cpp") {
  console.log("🟣 C++ Docker executor started");

  const result = await executeCppInDocker(code, input);

  return res.json({
    success: result.status === "success",
    status: result.status,
    output: result.output,
    error: result.error
  });
}

if (language === "java") {
  console.log("☕ Java Docker executor started");

  const result = await executeJavaInDocker(code, input);

  console.log("Execution result:", result);

  return res.json({
    success: result.status === "success",
    status: result.status,
    output: result.output,
    error: result.error
  });
}

  // Other languages
  return res.status(400).json({
    success: false,
    status: "error",
    output: "",
    error: `Execution for ${language} is not implemented yet.`
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    status: "error",
    output: "",
    error: "Route not found"
  });
});

// Start Server
const server= app.listen(PORT, () => {
  console.log("--------------------------------");
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log("--------------------------------");
});

// WebSocket Server
// ==========================================
// Interactive WebSocket
// ==========================================
const wss = new WebSocketServer({
  server
});
wss.on("connection", (ws) => {
  console.log("🔌 Interactive WebSocket connected");

  let dockerProcess = null;

  ws.send(
    JSON.stringify({
      type: "connected",
      message: "Interactive compiler connected"
    })
  );

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message.toString());

      console.log(
        "WebSocket message:",
        data
      );

      // ==========================================
      // START PROGRAM
      // ==========================================
      if (data.type === "start") {
        // Stop previous process if one exists
        if (dockerProcess) {
          stopInteractiveContainer(dockerProcess);
          dockerProcess = null;
        }

        const {
          language,
          code
        } = data;

        if (!language || !code) {
          ws.send(
            JSON.stringify({
              type: "error",
              error: "Language and code are required."
            })
          );

          return;
        }

        try {
          const result =
            await startInteractiveContainer(
              language,
              code,
              {
                // ------------------------------
                // Program output
                // ------------------------------
                onOutput: (output) => {
                  if (ws.readyState === 1) {
                    ws.send(
                      JSON.stringify({
                        type: "output",
                        output
                      })
                    );
                  }
                },

                // ------------------------------
                // Program error
                // ------------------------------
                onError: (error) => {
                  if (ws.readyState === 1) {
                    ws.send(
                      JSON.stringify({
                        type: "error",
                        error
                      })
                    );
                  }
                },

                // ------------------------------
                // Program finished
                // ------------------------------
                onClose: (exitCode) => {
                  if (ws.readyState === 1) {
                    ws.send(
                      JSON.stringify({
                        type: "exit",
                        exitCode
                      })
                    );
                  }

                  dockerProcess = null;
                }
              }
            );

          dockerProcess = result.process;

          ws.send(
            JSON.stringify({
              type: "started"
            })
          );

        } catch (error) {
          console.error(
            "Interactive start error:",
            error
          );

          ws.send(
            JSON.stringify({
              type: "error",
              error: error.message
            })
          );
        }
      }

      // ==========================================
      // SEND USER INPUT
      // ==========================================
      else if (data.type === "input") {
        if (!dockerProcess) {
          ws.send(
            JSON.stringify({
              type: "error",
              error: "No program is running."
            })
          );

          return;
        }

        sendInput(
          dockerProcess,
          data.input || ""
        );
      }

      // ==========================================
      // END INPUT
      // ==========================================
      else if (data.type === "end-input") {
        if (dockerProcess) {
          closeInput(dockerProcess);
        }
      }

      // ==========================================
      // STOP PROGRAM
      // ==========================================
      else if (data.type === "stop") {
        if (dockerProcess) {
          stopInteractiveContainer(
            dockerProcess
          );

          dockerProcess = null;
        }

        if (ws.readyState === 1) {
          ws.send(
            JSON.stringify({
              type: "stopped"
            })
          );
        }
      }

    } catch (error) {
      console.error(
        "WebSocket message error:",
        error
      );

      ws.send(
        JSON.stringify({
          type: "error",
          error: "Invalid WebSocket message."
        })
      );
    }
  });

  // ==========================================
  // Browser disconnected
  // ==========================================
  ws.on("close", () => {
    console.log(
      "🔌 Interactive WebSocket disconnected"
    );

    if (dockerProcess) {
      stopInteractiveContainer(
        dockerProcess
      );

      dockerProcess = null;
    }
  });
});