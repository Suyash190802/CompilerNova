import { spawn } from "child_process";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import os from "os";

// ==========================================
// Start Interactive Docker Container
// ==========================================
export async function startInteractiveContainer(language, code , callbacks={}) {
  const tempDir = path.join(
  os.tmpdir(),
  `online-compiler-interactive-${id}`
);

await fs.mkdir(tempDir, {
  recursive: true
});

  let sourceFile;
  let image;
  let command;
  const {onOutput,onError,onClose} = callbacks;

  try {
    // ==========================================
    // JavaScript
    // ==========================================
    if (language === "javascript") {
      sourceFile = "main.js";
      image = "online-compiler-javascript";

      await fs.writeFile(
        path.join(tempDir, sourceFile),
        code,
        "utf8"
      );

      command =
        `node /workspace/${sourceFile}`;
    }

    // ==========================================
    // Python
    // ==========================================
    else if (language === "python") {
      sourceFile = "main.py";
      image = "online-compiler-python";

      await fs.writeFile(
        path.join(tempDir, sourceFile),
        code,
        "utf8"
      );

      command =
        `python /workspace/${sourceFile}`;
    }

    // ==========================================
    // Java
    // ==========================================
    else if (language === "java") {
      sourceFile = "Main.java";
      image = "online-compiler-java";

      await fs.writeFile(
        path.join(tempDir, sourceFile),
        code,
        "utf8"
      );

      command =
        `mkdir -p /tmp/build && ` +
        `javac /workspace/Main.java -d /tmp/build && ` +
        `java -cp /tmp/build Main`;
    }

    // ==========================================
    // C
    // ==========================================
    else if (language === "c") {
  sourceFile = "main.c";
  image = "online-compiler-c";

  await fs.writeFile(
    path.join(tempDir, sourceFile),
    code,
    "utf8"
  );

  command =
    `gcc /workspace/main.c -o /tmp/program && ` +
    `stdbuf -o0 /tmp/program`;
}

    // ==========================================
    // C++
    // ==========================================
     else if (language === "cpp") {
  sourceFile = "main.cpp";
  image = "online-compiler-cpp";

  await fs.writeFile(
    path.join(tempDir, sourceFile),
    code,
    "utf8"
  );

  command =
    `g++ /workspace/main.cpp -o /tmp/program && ` +
    `stdbuf -o0 /tmp/program`;
}

    // ==========================================
    // Unsupported language
    // ==========================================
    else {
      throw new Error(
        `Unsupported language: ${language}`
      );
    }

    // ==========================================
    // Docker Arguments
    // ==========================================
    const dockerArgs = [
      "run",
      "--rm",

      // Interactive stdin
      "-i",

      // No network
      "--network",
      "none",

      // CPU
      "--cpus",
      "0.5",

      // Memory
      "--memory",
      "128m",

      // Process limit
      "--pids-limit",
      "64",

      // Read-only filesystem
      "--read-only",

      // Writable temporary directory
      "--tmpfs",
      "/tmp:rw,nosuid,size=32m,exec",

      // Source code
      "-v",
      `${tempDir}:/workspace:ro`,

      image,

      "sh",
      "-c",
      command
    ];

    console.log(
      "Starting interactive Docker:",
      dockerArgs.join(" ")
    );

    const dockerProcess = spawn(
      "docker",
      dockerArgs,
      {
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"]
      }
    );

    let output = "";
    let error = "";

    // ==========================================
    // STDOUT
    dockerProcess.stdout.on("data", (data) => {
  const text = data.toString();

  output += text;

  console.log(
    "Interactive stdout:",
    JSON.stringify(text)
  );

  if (onOutput) {
    onOutput(text);
  }
});

    // ==========================================
    // STDERR
      dockerProcess.stderr.on("data", (data) => {
  const text = data.toString();

  error += text;

  console.log(
    "Interactive stderr:",
    text
  );

  if (onError) {
    onError(text);
  }
});
    // Cleanup
    // ==========================================
    const cleanup = async () => {
      try {
        await fs.rm(tempDir, {
          recursive: true,
          force: true
        });
      } catch (err) {
        console.error(
          "Interactive cleanup error:",
          err.message
        );
      }
    };

    // ==========================================
    // Process Close
    // ==========================================
        dockerProcess.on("close", async (exitCode) => {
  console.log(
    "Interactive Docker closed:",
    exitCode
  );

  if (onClose) {
    onClose(exitCode);
  }

  await cleanup();
});

    // ==========================================
    // Process Error
    // ==========================================
    dockerProcess.on("error", async (err) => {
      console.error(
        "Interactive Docker error:",
        err.message
      );

      await cleanup();
    });

    return {
      process: dockerProcess,
      containerId: id,
      getOutput: () => output,
      getError: () => error
    };

  } catch (error) {
    // Cleanup if startup fails
    try {
      await fs.rm(tempDir, {
        recursive: true,
        force: true
      });
    } catch {}

    throw error;
  }
}

// ==========================================
// Send Input
// ==========================================
export function sendInput(process, input) {
  if (!process || !process.stdin) {
    return;
  }

  if (!process.stdin.destroyed) {
    process.stdin.write(input);
  }
}

// ==========================================
// Close Input
// ==========================================
export function closeInput(process) {
  if (!process || !process.stdin) {
    return;
  }

  if (!process.stdin.destroyed) {
    process.stdin.end();
  }
}

// ==========================================
// Stop Interactive Process
// ==========================================
export function stopInteractiveContainer(process) {
  if (!process) {
    return;
  }

  try {
    process.kill();
  } catch (error) {
    console.error(
      "Unable to stop interactive process:",
      error.message
    );
  }
}