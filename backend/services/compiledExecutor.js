
import { spawn } from "child_process";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

// ==========================================
// C Executor
// ==========================================
export async function executeCInDocker(code, input = "") {
  return executeCompiledInDocker({
    image: "online-compiler-c",
    sourceFile: "main.c",
    compiler: "gcc",
    code,
    input
  });
}

// ==========================================
// C++ Executor
// ==========================================
export async function executeCppInDocker(code, input = "") {
  return executeCompiledInDocker({
    image: "online-compiler-cpp",
    sourceFile: "main.cpp",
    compiler: "g++",
    code,
    input
  });
}

// ==========================================
// Java Executor
// ==========================================
export async function executeJavaInDocker(code, input = "") {
  console.log("☕ Java Docker executor started");
  console.log("Java input received:", JSON.stringify(input));

  return executeCompiledInDocker({
    image: "online-compiler-java",
    sourceFile: "Main.java",
    compiler: "javac",
    code,
    input,
    java: true
  });
}

// ==========================================
// Common Executor
// ==========================================
async function executeCompiledInDocker({
  image,
  sourceFile,
  compiler,
  code,
  input,
  java = false
}) {
  const id = crypto.randomUUID();

  // Use project-local temp directory
  const baseTempDir = path.join(process.cwd(), "temp");

  // Create temp folder if it doesn't exist
  await fs.mkdir(baseTempDir, { recursive: true });

  const tempDir = path.join(baseTempDir, `compiler-${id}`);

  await fs.mkdir(tempDir, { recursive: true });

  const sourcePath = path.join(tempDir, sourceFile);
  const inputPath = path.join(tempDir, "input.txt");

  try {
    // Write source code
    await fs.writeFile(sourcePath, code, "utf8");

    // Write stdin
    await fs.writeFile(inputPath, input || "", "utf8");

    console.log("Source:", sourcePath);
    console.log("Input:", inputPath);

    let command;

    if (java) {
      command =
        `mkdir -p /tmp/build && ` +
        `javac /workspace/${sourceFile} -d /tmp/build && ` +
        `java -cp /tmp/build Main < /workspace/input.txt`;
    } else {
      command =
        `${compiler} /workspace/${sourceFile} -o /tmp/program && ` +
        `/tmp/program < /workspace/input.txt`;
    }

    const dockerArgs = [
      "run",
      "--rm",

      "--network",
      "none",

      "--cpus",
      "0.5",

      "--memory",
      "128m",

      "--pids-limit",
      "64",

      "--read-only",

      "--tmpfs",
      "/tmp:rw,nosuid,size=32m,exec",

      "-v",
      `${tempDir}:/workspace:ro`,

      image,

      "sh",
      "-c",
      command
    ];

    console.log(
      "Running Docker:",
      dockerArgs.join(" ")
    );

    return await runDocker(dockerArgs);

  } finally {
    // Remove temporary directory
    try {
      await fs.rm(tempDir, {
        recursive: true,
        force: true
      });
    } catch (err) {
      console.error(
        "Temp cleanup error:",
        err.message
      );
    }
  }
}

// Docker Runner
function runDocker(dockerArgs) {
  return new Promise((resolve) => {
    const process = spawn("docker", dockerArgs, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

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

      console.log("Docker stdout:", data.toString());

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

      console.log("Docker stderr:", data.toString());

      if (error.length > MAX_OUTPUT) {
        error = error.slice(0, MAX_OUTPUT);
      }
    });

    // ==========================================
    // TIMEOUT
    // ==========================================
    const timeout = setTimeout(() => {
      if (finished) return;

      finished = true;

      console.log("Docker execution timed out.");

      process.kill();

      resolve({
        status: "error",
        output,
        error: "Execution timed out."
      });
    }, 10000);

    // ==========================================
    // PROCESS CLOSE
    // ==========================================
    process.on("close", (exitCode) => {
      if (finished) return;

      finished = true;

      clearTimeout(timeout);

      console.log("Docker process closed:", exitCode);

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

    // PROCESS ERROR
    
    process.on("error", (err) => {
      if (finished) return;

      finished = true;

      clearTimeout(timeout);

      console.error("Docker spawn error:", err);

      resolve({
        status: "error",
        output: "",
        error: err.message
      });
    });
  });
}