# Online Compiler

A full-stack web-based **Online Compiler** that allows users to write, compile, and execute code directly from their browser. The application provides a modern code editor using **Monaco Editor** and executes programs securely inside isolated **Docker containers**.

## 🚀 Features

* 📝 Monaco Editor for writing and editing code
* 💻 Support for multiple programming languages
* ▶️ Execute code directly from the browser
* ⌨️ Custom Standard Input (STDIN) support
* 📤 Displays program output and errors
* 🐳 Docker-based isolated code execution
* ⚡ React-based responsive frontend
* 🔗 REST API communication between frontend and backend
* 🛡️ Execution timeout and resource controls for safer execution
* 🔄 Real-time execution status and results

## 🛠️ Tech Stack

**Frontend**

* React.js
* Vite
* Monaco Editor
* CSS / Tailwind CSS

**Backend**

* Node.js
* Express.js
* REST API

**Execution Environment**

* Docker
* Language-specific Docker containers

## 🏗️ Project Architecture

```text
User
  ↓
React Frontend
  ↓
Monaco Editor
  ↓
Express REST API
  ↓
Docker Container
  ↓
Code Execution
  ↓
Output / Error
  ↓
React Frontend
```

## 🎯 Purpose

The project is designed to provide a simple and interactive coding environment where users can practice programming, provide custom input, execute their programs, and instantly view the results without installing a compiler or development environment locally.

## 🔮 Future Improvements

* Add user authentication
* Add code saving and history
* Support more programming languages
* Add code sharing functionality
* Add execution time and memory usage statistics
* Improve container resource isolation
* Add competitive programming features
* Add syntax themes and editor customization
