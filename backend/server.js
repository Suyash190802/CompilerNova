import express from "express";
import cors from "cors";

import { executeJavaScript } from "./services/javascriptExecutor.js";

const app = express();

const PORT = 5000;


// ========================================
// Middleware
// ========================================

app.use(cors());

app.use(express.json());


// ========================================
// Test Route
// ========================================

app.get("/", (req, res) => {

  res.json({
    success: true,
    message: "Online Compiler Backend is running!"
  });

});


// ========================================
// Execute Code
// ========================================

app.post("/api/execute", async (req, res) => {

  const { language, code, input } = req.body;


  console.log("--------------------------------");
  console.log("New execution request");
  console.log("Language:", language);
  console.log("Code:", code);
  console.log("Input:", input);
  console.log("--------------------------------");


  // Validate language

  if (!language) {

    return res.status(400).json({
      success: false,
      status: "error",
      error: "Language is required"
    });

  }


  // Validate code

  if (!code || !code.trim()) {

    return res.status(400).json({
      success: false,
      status: "error",
      error: "Code is required"
    });

  }


  // ========================================
  // JavaScript
  // ========================================

  if (language === "javascript") {

    console.log("🔥 JavaScript executor started");

    const result = await executeJavaScript(
      code,
      input
    );

    console.log("Execution result:", result);


    return res.json({

      success: result.status === "success",

      status: result.status,

      output: result.output,

      error: result.error

    });

  }


  // ========================================
  // Other languages
  // ========================================

  return res.json({

    success: false,

    status: "error",

    output: "",

    error: `Execution for ${language} is not implemented yet.`

  });

});


// ========================================
// 404
// ========================================

app.use((req, res) => {

  res.status(404).json({

    success: false,

    status: "error",

    error: "Route not found"

  });

});


// ========================================
// Start Server
// ========================================

app.listen(PORT, () => {

  console.log("--------------------------------");
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log("--------------------------------");

});