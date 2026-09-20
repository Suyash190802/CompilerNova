import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import "./App.css";

function App() {
  const [language, setLanguage] = useState("javascript");

  const [code, setCode] = useState(`function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("world"));
console.log(2 ** 10);`);

  // Normal stdin
  const [input, setInput] = useState("");

  // Output
  const [output, setOutput] = useState("");

  // Compiler status
  const [status, setStatus] = useState("idle");

  // Interactive mode
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [interactiveInput, setInteractiveInput] = useState("");

  // WebSocket
  const wsRef = useRef(null);

  const languages = [
    { value: "c", label: "C", ext: "c" },
    { value: "cpp", label: "C++", ext: "cpp" },
    { value: "java", label: "Java", ext: "java" },
    { value: "javascript", label: "JavaScript", ext: "js" },
    { value: "python", label: "Python", ext: "py" }
  ];

  const currentLang = languages.find(
    (l) => l.value === language
  );

  const fileName = `main.${currentLang?.ext ?? "txt"}`;

  const statusLabels = {
    idle: "Idle",
    running: "Running",
    success: "Success",
    error: "Error"
  };

  // ==========================================
  // Cleanup WebSocket when component unmounts
  // ==========================================
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.send(
            JSON.stringify({
              type: "stop"
            })
          );
        } catch {}

        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // ==========================================
  // Normal Compiler
  // ==========================================
  const handleRun = async () => {
    if (!code.trim()) {
      setOutput("No code to execute.");
      setStatus("error");
      return;
    }

    console.log("========== NORMAL RUN ==========");
    console.log("Language:", language);
    console.log("Input:", JSON.stringify(input));

    setStatus("running");
    setOutput("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/execute",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            language,
            code,
            input
          })
        }
      );

      const data = await response.json();

      console.log("Compiler response:", data);

      if (!response.ok) {
        setOutput(
          data.error || "Something went wrong."
        );

        setStatus("error");
        return;
      }

      setOutput(
        data.output || "(no output)"
      );

      setStatus(
        data.status === "success"
          ? "success"
          : "error"
      );

    } catch (error) {
      console.error(
        "Compiler connection error:",
        error
      );

      setOutput(
        "Unable to connect to the compiler server."
      );

      setStatus("error");
    }
  };

  // ==========================================
  // Interactive Compiler
  // ==========================================
  const handleInteractiveRun = () => {
    if (!code.trim()) {
      setOutput("No code to execute.");
      setStatus("error");
      return;
    }

    // Close previous WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}

      wsRef.current = null;
    }

    setOutput("");
    setInteractiveInput("");
    setStatus("running");

    console.log(
      "========== INTERACTIVE RUN =========="
    );

    console.log("Language:", language);

    const socket = new WebSocket(
      "ws://localhost:5000"
    );

    wsRef.current = socket;

    // ========================================
    // WebSocket Connected
    // ========================================
    socket.onopen = () => {
      console.log(
        "🔌 Interactive WebSocket connected"
      );

      socket.send(
        JSON.stringify({
          type: "start",
          language,
          code
        })
      );
    };

    // ========================================
    // WebSocket Message
    // ========================================
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(
          event.data
        );

        console.log(
          "WebSocket response:",
          data
        );

        // ------------------------------------
        // Connected
        // ------------------------------------
        if (data.type === "connected") {
          return;
        }

        // ------------------------------------
        // Program started
        // ------------------------------------
        if (data.type === "started") {
          console.log(
            "▶ Interactive program started"
          );

          return;
        }

        // ------------------------------------
        // Program output
        // ------------------------------------
        if (data.type === "output") {
          setOutput(
            (previous) =>
              previous + data.output
          );

          return;
        }

        // ------------------------------------
        // Program error
        // ------------------------------------
        if (data.type === "error") {
          setOutput(
            (previous) =>
              previous + data.error
          );

          setStatus("error");

          return;
        }

        // ------------------------------------
        // Program exited
        // ------------------------------------
        if (data.type === "exit") {
          console.log(
            "Program exited:",
            data.exitCode
          );

          setStatus(
            data.exitCode === 0
              ? "success"
              : "error"
          );

          return;
        }

        // ------------------------------------
        // Program stopped
        // ------------------------------------
        if (data.type === "stopped") {
          setStatus("idle");

          return;
        }

      } catch (error) {
        console.error(
          "WebSocket message parse error:",
          error
        );
      }
    };

    // ========================================
    // WebSocket Error
    // ========================================
    socket.onerror = (error) => {
      console.error(
        "WebSocket error:",
        error
      );

      setOutput(
        "Unable to connect to interactive compiler."
      );

      setStatus("error");
    };

    // ========================================
    // WebSocket Closed
    // ========================================
    socket.onclose = () => {
      console.log(
        "🔌 Interactive WebSocket disconnected"
      );

      wsRef.current = null;
    };
  };

  // ==========================================
  // Send Interactive Input
  // ==========================================
  const sendInteractiveInput = () => {
    const socket = wsRef.current;

    if (
      !socket ||
      socket.readyState !== WebSocket.OPEN
    ) {
      console.log(
        "Interactive session is not running."
      );

      return;
    }

    if (!interactiveInput.trim()) {
      return;
    }

    const value = interactiveInput;

    console.log(
      "Sending interactive input:",
      JSON.stringify(value)
    );

    // Send the actual input to the running Docker program
    socket.send(
      JSON.stringify({
        type: "input",
        input: value + "\n"
      })
    );

    // Echo the user's input in the terminal-like output
    // because stdin is not automatically echoed through Docker.
    setOutput(
      (previous) => previous + value + "\n"
    );

    setInteractiveInput("");
  };

  // ==========================================
  // Stop Interactive Program
  // ==========================================
  const stopInteractiveRun = () => {
    const socket = wsRef.current;

    if (socket) {
      if (
        socket.readyState ===
        WebSocket.OPEN
      ) {
        socket.send(
          JSON.stringify({
            type: "stop"
          })
        );
      }

      socket.close();

      wsRef.current = null;
    }

    setStatus("idle");
  };

  // ==========================================
  // Language Change
  // ==========================================
  const handleLanguageChange = (e) => {
    const selectedLanguage =
      e.target.value;

    setLanguage(selectedLanguage);

    setStatus("idle");
    setOutput("");

    setInput("");
    setInteractiveInput("");

    // Stop interactive program
    if (wsRef.current) {
      try {
        wsRef.current.send(
          JSON.stringify({
            type: "stop"
          })
        );

        wsRef.current.close();
      } catch {}

      wsRef.current = null;
    }

    // ========================================
    // C++
    // ========================================
    if (selectedLanguage === "cpp") {
      setCode(`#include <iostream>
using namespace std;

int main() {
    cout << "Hello World";
    return 0;
}`);
    }

    // ========================================
    // C
    // ========================================
    if (selectedLanguage === "c") {
      setCode(`#include <stdio.h>

int main() {
    printf("Hello World");
    return 0;
}`);
    }

    // ========================================
    // Python
    // ========================================
    if (selectedLanguage === "python") {
      setCode(`print("Hello World")`);
    }

    // ========================================
    // JavaScript
    // ========================================
    if (selectedLanguage === "javascript") {
      setCode(
        `console.log("Hello World");`
      );
    }

    // ========================================
    // Java
    // ========================================
    if (selectedLanguage === "java") {
      setCode(`public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`);
    }
  };

  // ==========================================
  // Ctrl + Enter
  // ==========================================
  const handleEditorKeyDown = (e) => {
    if (
      (e.metaKey || e.ctrlKey) &&
      e.key === "Enter"
    ) {
      e.preventDefault();

      if (interactiveMode) {
        handleInteractiveRun();
      } else {
        handleRun();
      }
    }
  };

  // ==========================================
  // Toggle Interactive Mode
  // ==========================================
  const handleInteractiveToggle = (e) => {
    const enabled =
      e.target.checked;

    setInteractiveMode(enabled);

    setStatus("idle");
    setOutput("");

    setInteractiveInput("");

    // Stop existing interactive process
    if (!enabled && wsRef.current) {
      try {
        if (
          wsRef.current.readyState ===
          WebSocket.OPEN
        ) {
          wsRef.current.send(
            JSON.stringify({
              type: "stop"
            })
          );
        }

        wsRef.current.close();
      } catch {}

      wsRef.current = null;
    }
  };

  return (
    <div
      className="app"
      onKeyDown={handleEditorKeyDown}
    >

      {/* =====================================
          Header
      ====================================== */}

      <header className="header">

        <div className="header-left">

          <h1>Compiler</h1>

          <div
            className={`status-pill ${status}`}
          >
            <span className="status-dot"></span>

            {statusLabels[status]}
          </div>

        </div>

        <div className="header-controls">

          <span className="shortcut-hint">
            Ctrl+Enter
          </span>

          {/* Interactive Toggle */}

          <label className="interactive-toggle">

            <input
              type="checkbox"
              checked={interactiveMode}
              onChange={
                handleInteractiveToggle
              }
            />

            Interactive

          </label>

          {/* Language */}

          <select
            value={language}
            onChange={
              handleLanguageChange
            }
          >
            {languages.map((lang) => (
              <option
                key={lang.value}
                value={lang.value}
              >
                {lang.label}
              </option>
            ))}
          </select>

          {/* Run */}

          <button
            onClick={
              interactiveMode
                ? handleInteractiveRun
                : handleRun
            }
            disabled={
              status === "running"
            }
          >
            ▶{" "}
            {status === "running"
              ? "Running..."
              : "Run"}
          </button>

        </div>

      </header>

      {/* =====================================
          Main Compiler
      ====================================== */}

      <main className="compiler">

        {/* ===================================
            Editor
        ==================================== */}

        <section className="editor-section">

          <div className="section-title">

            <span>
              Editor
            </span>

            <span className="file-tag">
              {fileName}
            </span>

          </div>

          <Editor
            height="100%"
            language={
              language === "cpp"
                ? "cpp"
                : language
            }
            theme="vs-dark"
            value={code}
            onChange={(value) =>
              setCode(value || "")
            }
            options={{
              minimap: {
                enabled: false
              },

              fontSize: 16,

              automaticLayout: true
            }}
          />

        </section>

        {/* ===================================
            Right Panel
        ==================================== */}

        <section className="right-panel">

          {/* =================================
              Input
          ================================== */}

          <div className="input-section">

            <div className="section-title">

              {interactiveMode
                ? "Interactive Input"
                : "Stdin"}

            </div>

            {/* ==============================
                Normal Stdin
            =============================== */}

            {!interactiveMode && (
              <textarea
                value={input}
                onChange={(e) => {
                  const value =
                    e.target.value;

                  console.log(
                    "STDIN changed:",
                    JSON.stringify(
                      value
                    )
                  );

                  setInput(value);
                }}
                placeholder="Input passed to your program..."
              />
            )}

            {/* ==============================
                Interactive Input
            =============================== */}

            {interactiveMode && (
              <div className="interactive-input">

                <input
                  type="text"
                  value={
                    interactiveInput
                  }
                  onChange={(e) =>
                    setInteractiveInput(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter"
                    ) {
                      e.preventDefault();

                      sendInteractiveInput();
                    }
                  }}
                  placeholder="Type input and press Enter..."
                  disabled={
                    status !== "running"
                  }
                />

                <button
                  onClick={
                    sendInteractiveInput
                  }
                  disabled={
                    status !== "running"
                  }
                >
                  Send
                </button>

                <button
                  onClick={
                    stopInteractiveRun
                  }
                  disabled={
                    status !== "running"
                  }
                >
                  Stop
                </button>

              </div>
            )}

          </div>

          {/* =================================
              Output
          ================================== */}

          <div className="output-section">

            <div className="section-title">
              Output
            </div>

            <pre>
              {output ||
                "Press Run, or Ctrl + Enter, to execute."}
            </pre>

            <div className="footer-bar">

              <span>

                {status === "idle" &&
                  "Ready"}

                {status === "running" &&
                  `Executing ${fileName}...`}

                {status === "success" &&
                  "Exited with code 0"}

                {status === "error" &&
                  "Exited with code 1"}

              </span>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default App;