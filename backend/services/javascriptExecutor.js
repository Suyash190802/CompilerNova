import { spawn } from "child_process";

export function executeJavaScript(code, input = "") {

  return new Promise((resolve) => {

    const process = spawn("node", ["-e", code]);

    let output = "";
    let error = "";
    let finished = false;


    // Capture program output
    process.stdout.on("data", (data) => {
      output += data.toString();
    });


    // Capture errors
    process.stderr.on("data", (data) => {
      error += data.toString();
    });


    // Send input
    if (input) {
      process.stdin.write(input);
    }

    process.stdin.end();


    // Timeout
    const timeout = setTimeout(() => {

      if (finished) {
        return;
      }

      finished = true;

      process.kill();

      resolve({
        status: "error",
        output,
        error: "Execution timed out."
      });

    }, 5000);


    // Process finished
    process.on("close", (exitCode) => {

      if (finished) {
        return;
      }

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

  });

}