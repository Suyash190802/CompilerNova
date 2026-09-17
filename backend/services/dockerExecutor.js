import { spawn } from "child_process";
import crypto from "crypto";

export function executeJavaScriptInDocker(code, input = "") {
  return new Promise((resolve) => {
    const containerName = `compiler-js-${crypto.randomUUID()}`;

    const dockerArgs = [
      "run",
      "--rm",
      "--name", containerName,

      // Security restrictions
      "--network", "none",
      "--cpus", "0.5",
      "--memory", "128m",
      "--pids-limit", "64",

      // Read-only container filesystem
      "--read-only",

      // Temporary writable directory
      "--tmpfs", "/tmp:rw,noexec,nosuid,size=16m",

      "online-compiler-javascript",

      "node",
      "-e",
      code
    ];

    const process = spawn("docker", dockerArgs);

    let output = "";
    let error = "";
    let finished = false;

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      error += data.toString();
    });

    // Send stdin to the container
    if (input) {
      process.stdin.write(input);
    }

    process.stdin.end();

    // Maximum execution time
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