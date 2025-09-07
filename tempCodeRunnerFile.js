const e = require("express");
var express = require("express");
var app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.listen(3000, function () {
    console.log("Server Started");
})
var mysql12 = require("mysql2");
var dbconfig = "mysql://avnadmin:AVNS_iT1v5IHqNucN7sspOKX@mysql-b444943-namanarora0927-24cf.f.aivencloud.com:13877/BuildNBit?ssl-mode=REQUIRED";
var mysqlVen = mysql12.createConnection(dbconfig);
mysqlVen.connect(function (er) {
    if (er == null)
        console.log("Sucessfully Connected to Server");
    else
        console.log(er.message);
});
app.get("/", function (req, resp) {
    resp.sendFile(__dirname + "/Public/index.html");
});

app.post("/login", function (req, resp) {
  var rad_Utype = req.body.rad_Utype;
  var email = req.body.txt_Email;
  var pwd = req.body.txt_pwd;

  if (rad_Utype === "Teacher") {
    mysqlVen.query("SELECT * FROM TeacherList WHERE Email = ? AND pwd = ?", [email, pwd], function (error, result) {
      if (error) {
        console.log(error.message);
        resp.send("<script>alert('An Error Occurred. Please try again later.');</script>");
      } else {
        if (result.length > 0) {
          console.log("Teacher login successful.");
           let url = `/Teacher_dashboard.html?email=${encodeURIComponent(email)}`;
          return resp.json({ redirect: url });
        } else {
          console.log("Invalid Email or Password for Teacher.");
          resp.send("<script>alert('Invalid Email or Password.');</script>");
        }
      }
    });
  } else if (rad_Utype === "Student") {
    mysqlVen.query("SELECT * FROM StudentList WHERE Email = ? AND pwd = ?", [email, pwd], function (error, result) {
      if (error) {
        console.log(error.message);
        resp.send("<script>alert('An Error Occurred. Please try again later.');</script>");
      } else {
        if (result.length > 0) {
          console.log("Student login successful.");
           let url = `/Student_dashboard.html?email=${encodeURIComponent(email)}`;
          return resp.json({ redirect: url });

        } else {
          console.log("Invalid Email or Password for Student.");
          resp.send("<script>alert('Invalid Email or Password.');</script>");
        }
      }
    });
  } else {
    resp.send("<script>alert('Please select a user type.');</script>");
  }
});
app.get("/signup", function (req, resp) {
    resp.sendFile(__dirname + "/Public/signup.html");
});
app.post("/Signup_student", function(req, resp) {
    var naam = req.body.txt_Name;
    var Email = req.body.txt_Email;
    var pwd = req.body.txt_pwd;
    var yearofstudy = req.body.txt_Yearofstudy;
    var instituename = req.body.txt_Institutename;
    var Cntact_no = req.body.txt_Contact;
    var filepath = "nopic.jpg";
    mysqlVen.query("INSERT INTO StudentList VALUES(?,?,?,?,?,?,?,null)", [naam, Email, pwd, yearofstudy, instituename, Cntact_no, filepath], function(error) {
        if (error == null) {
            console.log("Added Succesfully");
            resp.sendFile(__dirname + "/Public/index.html");
        } else {
            console.log(error.message);
            resp.send("An error occurred during student signup."); 
        }
    });
});
app.post("/doAdmin_signup", function(req, resp) {
    var naam = req.body.txt_Name;
    var Email = req.body.txt_Email;
    var pwd = req.body.txt_pwd;
    var Qualification = req.body.txt_Qualification;
    var Specilisation = req.body.txt_Specialisation;
    var Instititestudiedfrom = req.body.txt_Institute;
    var Experience = req.body.txt_Experience;
    var contact_no = req.body.txt_Contact;
    var filepath = "nopic.jpg";
    var aggrement = req.body.chk_Agreement;
    mysqlVen.query("INSERT INTO TeacherList VALUES(?,?,?,?,?,?,?,?,?,?)", [naam, Email, pwd, Qualification, Specilisation, Instititestudiedfrom, contact_no, aggrement, Experience, filepath], function(error) {
        if (error == null) {
            console.log("Added Succesfully");
            resp.sendFile(__dirname + "/Public/index.html");
        } else {
            console.log(error.message);
            resp.send("An error occurred during admin signup.");
        }
    });
});
app.get("/students", (req, res) => {
  const sql = "SELECT serial_no, name, email, course_enrolled, performance FROM enrolletstudents";
  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

app.post("/chat", async (req, res) => {
  const { message: userMessage, email } = req.body; // get email of logged-in user

  if (!email) {
    return res.json({ reply: "User email not provided." });
  }

  try {
    // Only fetch the logged-in student's data
    mysqlVen.query(
      "SELECT naam, Email, course_enrolled, performance FROM enrolletdstudents WHERE Email = ?",
      [email],
      async (err, rows) => {
        if (err) {
          console.error("Database query error:", err);
          return res.json({ reply: "Error fetching student data." });
        }

        if (rows.length === 0) {
          return res.json({ reply: "No data found for this user." });
        }

        const student = rows[0];
        const context = `Name: ${student.naam}, Email: ${student.Email}, Course: ${student.course_enrolled}, Performance: ${student.performance}`;

        // Call Gemini API
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCvu1c85-axt9Mft-01r9_h9NKwjNpEbF4`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `You are a helpful assistant for a student dashboard. 
Here is the student's data:
${context}

User query: ${userMessage}`
                      }
                    ]
                  }
                ]
              })
            }
          );

          const data = await response.json();
          console.log("Gemini raw response:", JSON.stringify(data, null, 2));

          let reply = "Sorry, I couldn’t generate a response.";
          if (data?.candidates?.length > 0) {
            if (data.candidates[0]?.content?.parts?.length > 0) {
              reply = data.candidates[0].content.parts
                .map(p => p.text || "")
                .join(" ")
                .trim();
            }
          }

          res.json({ reply });
        } catch (apiErr) {
          console.error("Gemini API Error:", apiErr);
          res.json({ reply: "Error contacting AI." });
        }
      }
    );
  } catch (err) {
    console.error("Error:", err);
    res.json({ reply: "Unexpected server error." });
  }
});


app.post("/enroll", (req, res) => {
    const { email, course } = req.body;
    if (!email || !course) {
        return res.status(400).json({ message: "Email and course are required" });
    }
mysqlVen.query("select Naam from StudentList where Email=?", [email], (err, result) => {
    const sql = "INSERT INTO enrolletdstudents (Email, naam, course_enrolled, performance) VALUES (?, ?, ?, ?)";
    const values = [email, result[0].Naam, course, "Not Started"]; // using email prefix as naam, performance default

    mysqlVen.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error inserting enrollment:", err);
            return res.status(500).json({ message: "Database error" });
        }
        res.json({ message: `Successfully enrolled in ${course}` });
    });
  })
});

app.get("/courses", (req, res) => {
    mysqlVen.query("SELECT * FROM CourseList", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results); // send course list
    });
});

app.post("/add_course", function(req, resp) {
    const course_name = req.body.txt_CourseName;
    const course_detail = req.body.txt_CourseDetail;
    const email = req.body.email;

    mysqlVen.query(
        "INSERT INTO CourseList (naam, Email, descriptionn) VALUES (?, ?, ?)",
        [course_name, email, course_detail],
        function(error) {
            if (!error) {
                console.log("Course Added Successfully");
                resp.json({ success: true, message: "Course added successfully!" });
            } else {
                console.log(error.message);
                resp.status(500).json({ success: false, message: error.message });
            }
        }
    );
});