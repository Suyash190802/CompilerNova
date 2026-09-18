import { useState } from "react";
import Editor from "@monaco-editor/react";
import "./App.css";

function App() {
  const [language, setLanguage] = useState("javascript");

  const [code, setCode] = useState(`function greet(name) {
  return "Hello, " + name + "!";
}

console.log(greet("world"));
console.log(2 ** 10);`);

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("idle"); // idle | running | success | error

  const languages = [
    { value: "c", label: "C", ext: "c" },
    { value: "cpp", label: "C++", ext: "cpp" },
    { value: "java", label: "Java", ext: "java" },
    { value: "javascript", label: "JavaScript", ext: "js" },
    { value: "python", label: "Python", ext: "py" }
  ];

  const currentLang = languages.find((l) => l.value === language);
  const fileName = `main.${currentLang?.ext ?? "txt"}`;

  const statusLabels = {
    idle: "Idle",
    running: "Running",
    success: "Success",
    error: "Error"
  };

const handleRun = async () => {
  if (!code.trim()) {
    setOutput("No code to execute.");
    setStatus("error");
    return;
  }

  setStatus("running");
  setOutput("");

  try {
    const response = await fetch("http://localhost:5000/api/execute", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        language,
        code,
        input
      })
    });

    const data = await response.json();
    console.log("complier response", data)

    if (!response.ok) {
      setOutput(data.error || "Something went wrong.");
      setStatus("error");
      return;
    }

    setOutput(data.output || "(no output)");

    setStatus(
      data.status === "success"
        ? "success"
        : "error"
    );

  } catch (error) {
    console.error(error);

    setOutput(
      "Unable to connect to the compiler server."
    );

    setStatus("error");
  }
};
  const handleLanguageChange = (e) => {
    const selectedLanguage = e.target.value;
    setLanguage(selectedLanguage);
    setStatus("idle");
    setOutput("");

    if (selectedLanguage === "cpp") {
      setCode(`#include <iostream>
using namespace std;

int main() {
    cout << "Hello World";
    return 0;
}`);
    }

    if (selectedLanguage === "c") {
      setCode(`#include <stdio.h>

int main() {
    printf("Hello World");
    return 0;
}`);
    }

    if (selectedLanguage === "python") {
      setCode(`print("Hello World")`);
    }

    if (selectedLanguage === "javascript") {
      setCode(`console.log("Hello World");`);
    }

    if (selectedLanguage === "java") {
      setCode(`public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`);
    }
  };

  // Ctrl/Cmd + Enter to run
  const handleEditorKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
    }
  };

  return (
    <div className="app" onKeyDown={handleEditorKeyDown}>
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>Compiler</h1>
          <div className={`status-pill ${status}`}>
            <span className="status-dot"></span>
            {statusLabels[status]}
          </div>
        </div>

        <div className="header-controls">
          <span className="shortcut-hint">Ctrl+Enter</span>

          <select value={language} onChange={handleLanguageChange}>
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          <button onClick={handleRun} disabled={status === "running"}>
            ▶ {status === "running" ? "Running..." : "Run"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="compiler">
        {/* Code Editor */}
        <section className="editor-section">
          <div className="section-title">
            <span>Editor</span>
            <span className="file-tag">{fileName}</span>
          </div>

          <Editor
            height="100%"
            language={language === "cpp" ? "cpp" : language}
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 16,
              automaticLayout: true
            }}
          />
        </section>

        {/* Right Side */}
        <section className="right-panel">
          {/* Input */}
          <div className="input-section">
            <div className="section-title">Stdin</div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Input passed to your program..."
            />
          </div>

          {/* Output */}
          <div className="output-section">
            <div className="section-title">Output</div>

            <pre>
              {output || "Press Run, or Ctrl + Enter, to execute."}
            </pre>

            <div className="footer-bar">
              <span>
                {status === "idle" && "Ready"}
                {status === "running" && `Executing ${fileName}...`}
                {status === "success" && "Exited with code 0"}
                {status === "error" && "Exited with code 1"}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;