const http = require("http");
const fs = require("fs");
const url = require("url");

function readStudents() {
  const data = fs.readFileSync("./students.json");
  return JSON.parse(data);
}

function writeStudents(students) {
  fs.writeFileSync("./students.json", JSON.stringify(students, null, 2));
}


function sendResponse(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true); // true → parse query string
  const { pathname, query } = parsedUrl;
  const method = req.method;

  // --------------------------
  //  GET /students  (list all)
  // --------------------------
  if (pathname === "/students" && method === "GET") {
    let students = readStudents();

    // Filter by course
    if (query.course) {
      students = students.filter(
        (s) => s.course.toLowerCase() === query.course.toLowerCase()
      );
    }

    // Sort alphabetically
    students.sort((a, b) => a.name.localeCompare(b.name));

    return sendResponse(res, 200, students);
  }

  // --------------------------
  //  GET /students/:id
  // --------------------------
  if (pathname.startsWith("/students/") && method === "GET") {
    const id = pathname.split("/")[2];
    const students = readStudents();
    const student = students.find((s) => s.id == id);

    if (!student) {
      return sendResponse(res, 404, { error: "Student not found" });
    }

    return sendResponse(res, 200, student);
  }


  if (pathname === "/students" && method === "POST") {
    try {
      const body = await parseBody(req);
      const { name, age, course } = body;

      if (!name || !course) {
        return sendResponse(res, 400, {
          error: "Name and course are required",
        });
      }

      const students = readStudents();
      const newStudent = {
        id: students.length ? students[students.length - 1].id + 1 : 1,
        name,
        age,
        course,
      };

      students.push(newStudent);
      writeStudents(students);

      return sendResponse(res, 201, {
        message: "Student added successfully",
        student: newStudent,
      });
    } catch (err) {
      return sendResponse(res, 400, { error: "Invalid JSON data" });
    }
  }

  if (pathname.startsWith("/students/") && method === "PUT") {
    const id = pathname.split("/")[2];
    try {
      const body = await parseBody(req);
      const { name, age, course } = body;

      if (!name || !course) {
        return sendResponse(res, 400, {
          error: "Name and course are required",
        });
      }

      const students = readStudents();
      const index = students.findIndex((s) => s.id == id);

      if (index === -1) {
        return sendResponse(res, 404, { error: "Student not found" });
      }

      students[index] = { ...students[index], name, age, course };
      writeStudents(students);

      return sendResponse(res, 200, {
        message: "Student updated successfully",
        student: students[index],
      });
    } catch (err) {
      return sendResponse(res, 400, { error: "Invalid JSON data" });
    }
  }

  if (pathname.startsWith("/students/") && method === "DELETE") {
    const id = pathname.split("/")[2];
    const students = readStudents();
    const student = students.find((s) => s.id == id);

    if (!student) {
      return sendResponse(res, 404, { error: "Student not found" });
    }

    const newStudents = students.filter((s) => s.id != id);
    writeStudents(newStudents);

    return sendResponse(res, 200, { message: "Student deleted successfully" });
  }

  sendResponse(res, 404, { error: "Route not found" });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
