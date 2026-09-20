import { spawn } from "child_process";
import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";

// ==========================================
// C
// ==========================================
export async function executeCInDocker(code, input = "") {
  console.log("🔵 C Docker executor started");

  return executeCompiledInDocker({
    image: "online-compiler-c",
    sourceFile: "main.c",
    compiler: "gcc",
    code,
    input
  });
}

// ==========================================
// C++
// ==========================================
export async function executeCppInDocker(code, input = "") {
  console.log("🔵 C++ Docker executor started");

  return executeCompiledInDocker({
    image: "online-compiler-cpp",
    sourceFile: "main.cpp",
    compiler: "g++",
    code,
    input
  });
}

// ==========================================
// Java
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
// Common compiled executor
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

  // Use the operating system's temporary directory.
  // Nothing will be created inside the project.
  const tempDir = path.join(
    os.tmpdir(),
    `online-compiler-${id}`
  );

  await fs.mkdir(tempDir, {
    recursive: true
  });

  const sourcePath = path.join(
    tempDir,
    sourceFile
  );

  const inputPath = path.join(
    tempDir,
    "input.txt"
  );

  try {
    // ========================================
    // Write source code
    // ========================================
    await fs.writeFile(
      sourcePath,
      code,
      "utf8"
    );

    // ========================================
    // Write stdin
    // ========================================
    await fs.writeFile(
      inputPath,
      input || "",
      "utf8"
    );

    console.log("Source:", sourcePath);
    console.log("Input:", inputPath);

    let command;

    // ========================================
    // Java
    // ========================================
    if (java) {
      command =
        `mkdir -p /tmp/build && ` +
        `javac /workspace/${sourceFile} -d /tmp/build && ` +
        `java -cp /tmp/build Main < /workspace/input.txt`;
    }

    // ========================================
    // C / C++
    // ========================================
    else {
      command =
        `${compiler} /workspace/${sourceFile} -o /tmp/program && ` +
        `/tmp/program < /workspace/input.txt`;
    }

    // ========================================
    // Docker
    // ========================================
    const dockerArgs = [
      "run",
      "--rm",

      // Security
      "--network",
      "none",

      "--cpus",
      "0.5",

      "--memory",
      "128m",

      "--pids-limit",
      "64",

      // Container filesystem
      "--read-only",

      // Executable temporary filesystem
      "--tmpfs",
      "/tmp:rw,nosuid,size=32m,exec",

      // Source/input mounted read-only
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
    // ========================================
    // ALWAYS delete temporary files
    // ========================================
    try {
      await fs.rm(tempDir, {
        recursive: true,
        force: true
      });

      console.log(
        "🧹 Temporary files cleaned:"
      );

      console.log(tempDir);

    } catch (error) {
      console.error(
        "Temp cleanup error:",
        error.message
      );
    }
  }
}

// ==========================================
// Run Docker process
// ==========================================
function runDocker(dockerArgs) {
  return new Promise((resolve) => {
    const dockerProcess = spawn(
      "docker",
      dockerArgs,
      {
        windowsHide: true,
        stdio: [
          "ignore",
          "pipe",
          "pipe"
        ]
      }
    );

    let output = "";
    let error = "";
    let finished = false;

    const MAX_OUTPUT = 100000;

    // ========================================
    // STDOUT
    // ========================================
    dockerProcess.stdout.on(
      "data",
      (data) => {
        if (finished) return;

        output += data.toString();

        console.log(
          "Docker stdout:",
          data.toString()
        );

        if (
          output.length >
          MAX_OUTPUT
        ) {
          finished = true;

          dockerProcess.kill();

          resolve({
            status: "error",
            output:
              output.slice(
                0,
                MAX_OUTPUT
              ),
            error:
              "Output limit exceeded."
          });
        }
      }
    );

    // ========================================
    // STDERR
    // ========================================
    dockerProcess.stderr.on(
      "data",
      (data) => {
        if (finished) return;

        error += data.toString();

        console.log(
          "Docker stderr:",
          data.toString()
        );

        if (
          error.length >
          MAX_OUTPUT
        ) {
          error =
            error.slice(
              0,
              MAX_OUTPUT
            );
        }
      }
    );

    // ========================================
    // Timeout
    // ========================================
    const timeout = setTimeout(() => {
      if (finished) return;

      finished = true;

      console.log(
        "⏱️ Docker execution timed out."
      );

      dockerProcess.kill();

      resolve({
        status: "error",
        output,
        error:
          "Execution timed out."
      });

    }, 10000);

    // ========================================
    // Process closed
    // ========================================
    dockerProcess.on(
      "close",
      (exitCode) => {
        if (finished) return;

        finished = true;

        clearTimeout(timeout);

        console.log(
          "Docker process closed:",
          exitCode
        );

        if (exitCode === 0) {
          resolve({
            status: "success",
            output:
              output ||
              "(no output)",
            error: ""
          });
        } else {
          resolve({
            status: "error",
            output,
            error:
              error ||
              `Process exited with code ${exitCode}`
          });
        }
      }
    );

    // ========================================
    // Docker spawn error
    // ========================================
    dockerProcess.on(
      "error",
      (err) => {
        if (finished) return;

        finished = true;

        clearTimeout(timeout);

        resolve({
          status: "error",
          output: "",
          error: err.message
        });
      }
    );
  });
}