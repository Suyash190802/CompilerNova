import { spawn } from "child_process";
import crypto from "crypto";

// ==========================================
// JavaScript Executor
// ==========================================
export function executeJavaScriptInDocker(code, input = "") {
  return executeInDocker({
    image: "online-compiler-javascript",
    command: ["node", "-e", code],
    input
  });
}

// ==========================================
// Python Executor
// ==========================================
export function executePythonInDocker(code, input = "") {
  return executeInDocker({
    image: "online-compiler-python",
    command: ["python", "-c", code],
    input
  });
}

// ==========================================
// Common Docker Executor
// ==========================================
function executeInDocker({ image, command, input }) {
  return new Promise((resolve) => {
    const containerName = `compiler-${crypto.randomUUID()}`;

    const dockerArgs = [
      "run",

      // Remove container automatically
      "--rm",

      // Interactive mode so stdin works
      "-i",

      // Unique container name
      "--name",
      containerName,

      // Disable internet
      "--network",
      "none",

      // CPU limit
      "--cpus",
      "0.5",

      // RAM limit
      "--memory",
      "128m",

      // Process limit
      "--pids-limit",
      "64",

      // Docker image
      image,

      // Command
      ...command
    ];

    const process = spawn("docker", dockerArgs);

    let output = "";
    let error = "";
    let finished = false;

    const MAX_OUTPUT = 100000;

    // ==========================================
    // STDOUT
    // ==========================================
    process.stdout.on("data", (data) => {
      if (finished) return;

      output += data.toString();

      // Prevent unlimited output
      if (output.length > MAX_OUTPUT) {
        finished = true;

        process.kill();

        resolve({
          status: "error",
          output: output.slice(0, MAX_OUTPUT),
          error: "Output limit exceeded."
        });
      }
    });

    // ==========================================
    // STDERR
    // ==========================================
    process.stderr.on("data", (data) => {
      if (finished) return;

      error += data.toString();

      // Prevent unlimited error output
      if (error.length > MAX_OUTPUT) {
        error = error.slice(0, MAX_OUTPUT);
      }
    });

    // ==========================================
    // Send User Input
    // ==========================================
    if (input) {
      process.stdin.write(input);
    }

    process.stdin.end();

    // ==========================================
    // Execution Timeout
    // ==========================================
    const timeout = setTimeout(() => {
      if (finished) return;

      finished = true;

      process.kill();

      resolve({
        status: "error",
        output,
        error: "Execution timed out."
      });
    }, 5000);

    // ==========================================
    // Docker Process Finished
    // ==========================================
    process.on("close", (exitCode) => {
      if (finished) return;

      finished = true;

      clearTimeout(timeout);

      if (exitCode === 0) {
        resolve({
          status: "success",
          output: output || "(no output)",
          error: ""
        });
      } else {
        resolve({
          status: "error",
          output,
          error: error || `Process exited with code ${exitCode}`
        });
      }
    });

    // ==========================================
    // Docker Process Error
    // ==========================================
    process.on("error", (err) => {
      if (finished) return;

      finished = true;

      clearTimeout(timeout);

      resolve({
        status: "error",
        output: "",
        error: err.message
      });
    });
  });
}