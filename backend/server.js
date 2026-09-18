import express from "express";
import cors from "cors";
import { executeJavaScriptInDocker, executePythonInDocker } from "./services/dockerExecutor.js";
import { executeCInDocker , executeCppInDocker} from "./services/compiledExecutor.js";  

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
app.listen(PORT, () => {
  console.log("--------------------------------");
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log("--------------------------------");
});