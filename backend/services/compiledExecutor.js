import { spawn } from "child_process";
import crypto from "crypto";

export function executeCInDocker(code, input = "") {
  return executeCompiledInDocker({
    image: "online-compiler-c",
    sourceFile: "main.c",
    compiler: "gcc",
    source: code,
    input
  });
}

export function executeCppInDocker(code, input = "") {
  return executeCompiledInDocker({
    image: "online-compiler-cpp",
    sourceFile: "main.cpp",
    compiler: "g++",
    source: code,
    input
  });
}

function executeCompiledInDocker({
  image,
  sourceFile,
  compiler,
  source,
  input
}) {
  return new Promise((resolve) => {
    const containerName = `compiler-${crypto.randomUUID()}`;

    const command = `
      printf '%s' '${escapeShell(source)}' > /tmp/${sourceFile} &&
      ${compiler} /tmp/${sourceFile} -o /tmp/program &&
      /tmp/program
    `;

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
      "sh",
      "-c",
      command
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

function escapeShell(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "'\\''");
}