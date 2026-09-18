import { spawn } from "child_process";
import crypto from "crypto";

// JavaScript


export function executeJavaScriptInDocker(code, input = "") {
  return executeInDocker({
    image: "online-compiler-javascript",
    command: ["node", "-e", code],
    input
  });
}


// Python


export function executePythonInDocker(code, input = "") {
  return executeInDocker({
    image: "online-compiler-python",
    command: ["python", "-c", code],
    input
  });
}

// ================================
// Java
// ================================
export function executeJavaInDocker(code, input = "") {
  return new Promise((resolve) => {
    const containerName = `compiler-java-${crypto.randomUUID()}`;

    const dockerArgs = [
      "run",
      "--rm",
      "-i",
      "--name",
      containerName,

      "--network",
      "none",
      "--cpus",
      "0.5",
      "--memory",
      "128m",
      "--pids-limit",
      "64",

      "online-compiler-java",

      "sh",
      "-c",
      "cat > /tmp/Main.java && javac /tmp/Main.java -d /tmp && java -cp /tmp Main"
    ];

    const process = spawn("docker", dockerArgs);

    let output = "";
    let error = "";
    let finished = false;

    process.stdout.on("data", (data) => {
      output += data.toString();

      if (output.length > 100000 && !finished) {
        finished = true;
        process.kill();

        resolve({
          status: "error",
          output: output.slice(0, 100000),
          error: "Output limit exceeded."
        });
      }
    });

    process.stderr.on("data", (data) => {
      error += data.toString();

      if (error.length > 100000) {
        error = error.slice(0, 100000);
      }
    });

    // Send Java source code first
    process.stdin.write(code);

    // IMPORTANT:
    // The Java program also needs stdin.
    // For now we separate source and program input
    // using a marker.
    process.stdin.end();

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

// Common Docker Executor


function executeInDocker({ image, command, input }) {
  return new Promise((resolve) => {
    const containerName = `compiler-${crypto.randomUUID()}`;

    const dockerArgs = [
      "run",
      "--rm",
      "--name",
      containerName,

      "--network",
      "none",
      "--cpus",
      "0.5",
      "--memory",
      "128m",
      "--pids-limit",
      "64",

      image,
      ...command
    ];

    const process = spawn("docker", dockerArgs);

    let output = "";
    let error = "";
    let finished = false;

    process.stdout.on("data", (data) => {
      output += data.toString();

      if (output.length > 100000 && !finished) {
        finished = true;
        process.kill();

        resolve({
          status: "error",
          output: output.slice(0, 100000),
          error: "Output limit exceeded."
        });
      }
    });

    process.stderr.on("data", (data) => {
      error += data.toString();

      if (error.length > 100000) {
        error = error.slice(0, 100000);
      }
    });

    if (input) {
      process.stdin.write(input);
    }

    process.stdin.end();

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

    process.on("close", (exitCode) => {
      if (finished) return;

      finished = true;
      clearTimeout(timeout);

      resolve({
        status: exitCode === 0 ? "success" : "error",
        output: output || "(no output)",
        error: exitCode === 0
          ? ""
          : error || `Process exited with code ${exitCode}`
      });
    });

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