// Define credentials at the top-level scope
const teacherCredentials = {
    email: 'teacher@example.com',
    password: 'teacher123'
};

const parentCredentials = {
    email: 'parent@example.com',
    password: 'parent123'
};

const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const app = express();

// Create MySQL connection
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "hometution"
});

connection.connect((err) => {
    if (err) {
        console.error("Error connecting to MySQL:", err);
        return;
    }
    console.log("Connected to MySQL database");
});

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "Public/images");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Set up view engine
app.set("view engine", "ejs");

// Enable static files
app.use(express.static("public"));

// Enable form processing
app.use(express.urlencoded({ extended: false }));

// Routes

// Signup routes
app.post('/signup/teacher', (req, res) => {
    const { name, email, phone, address, password, qualification, experience, hourlyRate, image, subjects } = req.body;
  
    // Insert into MySQL
    const sql = 'INSERT INTO tutors (name, email, phone, address, password, qualification, experience, hourlyRate, image, subjects) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    connection.query(sql, [name, email, phone, address, password, qualification, experience, hourlyRate, image, JSON.stringify(subjects)], (err, result) => {
      if (err) throw err;
      console.log(result);
      // Redirect to /tutors after successful signup
      res.redirect('/tutors');
    });
});
  
app.post('/signup/parent', (req, res) => {
    const { name, email, phone, address, password, childName } = req.body;
  
    // Insert into MySQL
    const sql = 'INSERT INTO parents (name, email, phone, address, password, childName) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(sql, [name, email, phone, address, password, childName], (err, result) => {
      if (err) throw err;
      console.log(result);
      // Redirect to /parents after successful signup
      res.redirect('/parents');
    });
});

// Login route
app.post('/entry', (req, res) => {
    const { email, password } = req.body;

    // Query to check in parents table
    const sqlParents = "SELECT * FROM parents WHERE email = ? AND password = ?";
    connection.query(sqlParents, [email, password], (errorParents, resultsParents) => {
        if (errorParents) {
            console.error("Error querying parents:", errorParents);
            return res.status(500).send("Internal Server Error");
        }

        // Query to check in tutors table
        const sqlTutors = "SELECT * FROM tutors WHERE email = ? AND password = ?";
        connection.query(sqlTutors, [email, password], (errorTutors, resultsTutors) => {
            if (errorTutors) {
                console.error("Error querying tutors:", errorTutors);
                return res.status(500).send("Internal Server Error");
            }

            // Check if credentials match either parents or tutors
            if (resultsParents.length > 0) {
                // Redirect to parents page if credentials match
                return res.redirect('/parents');
            } else if (resultsTutors.length > 0) {
                // Redirect to tutors page if credentials match
                return res.redirect('/tutors');
            } else {
                // If no match, redirect back to login page with error
                return res.redirect('/entry');
            }
        });
    });
});

// Get all tutors route
app.get('/tutors', (req, res) => {
    const sql = "SELECT * FROM tutors";
    connection.query(sql, (error, results) => {
        if (error) {
            console.error("Error fetching tutors:", error.message);
            return res.status(500).send("Error fetching tutors");
        }
        res.render("teachers", { tutors: results });
    });
});

app.get("/parent/:id", (req, res) => {
    const parentId = req.params.id;
    const sql = "SELECT * FROM parents WHERE parentId = ?";
    connection.query(sql, [parentId], (error, results) => {
        if (error) {
            console.error("Database query error:", error.message);
            return res.status(500).send("Error retrieving parent by ID");
        }
        if (results.length > 0) {
            res.render("parent", { parent: results[0] }); // Render HTML page with parent data
        } else {
            res.status(404).send("Parent not found");
        }
    });
});

// Define routes
app.get("/nonadmintutor", (req, res) => {
    // Query tutors data from database
    const sql = "SELECT * FROM tutors";

    connection.query(sql, (error, results) => {
        if (error) {
            console.error("Database query error:", error.message);
            return res.status(500).send("Error retrieving tutors");
        }
        
        // Render nonadmintutor.ejs with tutors data
        res.render("nonadmintutor", { tutors: results }); // Assuming results is an array of tutors
    });
});



// Route to render the form to edit a tutor
app.get("/editTutor/:id", (req, res) => {
    const tutorId = req.params.id;
    const sql = "SELECT * FROM tutors WHERE tutor_id = ?";
    
    // Fetch data from MySQL based on the tutor ID
    connection.query(sql, [tutorId], (error, results) => {
        if (error) {
            console.error("Database query error:", error.message);
            return res.status(500).send("Error retrieving tutor by ID");
        }
        
        // Check if any tutor with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the tutor data
            res.render("editTutor", { tutor: results[0] });
        } else {
            // If no tutor with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send("Tutor not found");
        }
    });
});

// Route to handle form submission for editing a tutor
app.post("/editTutor/:id", upload.single("image"), (req, res) => {
    const tutorId = req.params.id;
    // Extract tutor data from the request body
    const { name, email, phone, address, password, qualification, experience, hourlyRate } = req.body;
    // Handle file upload
    let image = req.body.currentImage; // Retrieve current image filename
    if (req.file) { // If new image is uploaded
        image = req.file.filename; // Set image to be new image filename
    }

    // Construct the SQL query to update the tutor record
    const sql = `
        UPDATE tutors
        SET name = ?, email = ?, phone = ?, address = ?, password = ?, qualification = ?, experience = ?, hourlyRate = ?, image = ?
        WHERE tutor_id = ?
    `;
    
    // Execute the update query
    connection.query(sql, [name, email, phone, address, password, qualification, experience, hourlyRate, image, tutorId], (error, results) => {
        if (error) {
            // Handle any error that occurs during the database operation
            console.error("Error updating tutor:", error);
            res.status(500).send("Error updating tutor");
        } else {
            // Send a success response
            res.redirect("/tutors");
        }
    });
});

// Route to render the form to edit a parent
app.get("/editParent/:id", (req, res) => {
    const parentId = req.params.id;
    const sql = "SELECT * FROM parents WHERE parent_id = ?";
    
    // Fetch data from MySQL based on the parent ID
    connection.query(sql, [parentId], (error, results) => {
        if (error) {
            console.error("Database query error:", error.message);
            return res.status(500).send("Error retrieving parent by ID");
        }
        
        // Check if any parent with the given ID was found
        if (results.length > 0) {
            // Render HTML page with the parent data
            res.render("editParent", { parent: results[0] });
        } else {
            // If no parent with the given ID was found, render a 404 page or handle it accordingly
            res.status(404).send("Parent not found");
        }
    });
});

// Route to handle form submission for editing a parent
app.post("/editParent/:id", upload.single("image"), (req, res) => {
    const parentId = req.params.id;
    
    // Extract parent data from the request body
    const { name, email, phone, address, password } = req.body;
    
    // Handle file upload
    let image = req.body.currentImage; // Retrieve current image filename
    if (req.file) { // If new image is uploaded
        image = req.file.filename; // Set image to be new image filename
    }

    // SQL query to update the parent record
    const sql = `
        UPDATE parents
        SET name = ?, email = ?, phone = ?, address = ?, password = ?, image = ?
        WHERE parent_id = ?
    `;

    // Execute the query
    connection.query(sql, [name, email, phone, address, password, images, parentId], (error, results) => {
        if (error) {
            // Log the error message
            console.error("Error updating parent:", error.message);
            // Send a detailed error message to the client
            res.status(500).send(`Error updating parent: ${error.message}`);
        } else {
            console.log(`Parent with ID ${parentId} updated successfully`);
            // Redirect to the parents list page
            res.redirect("/parents");
        }
    });
});






// Update tutor route
app.post('/editTutor/:tutor_id', (req, res) => {
    const tutorId = req.params.tutor_id;
    const { name, email, phone, address, qualification, experience, hourlyRate, subjects } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !address || !qualification || !experience || !hourlyRate || !subjects) {
        return res.status(400).send("All fields are required.");
    }

    // Update tutor in MySQL
    const sql = `
        UPDATE tutors
        SET name = ?, email = ?, phone = ?, address = ?, qualification = ?, experience = ?, hourlyRate = ?, subjects = ?
        WHERE tutor_id = ?
    `;
    const values = [name, email, phone, address, qualification, experience, hourlyRate, JSON.stringify(subjects), tutorId];

    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error("Error updating tutor:", error.message);
            return res.status(500).send("Error updating tutor information.");
        }
        console.log(`Tutor with ID ${tutorId} updated successfully.`);
        res.redirect('/tutors');
    });
});

app.get("/deleteParent/:id", (req, res) => {
    const parentId = req.params.id;
    const sql = "DELETE FROM parents WHERE parentId = ?";
    connection.query(sql, [parentId], (error, results) => {
        if (error) {
            console.error("Error deleting parent:", error);
            res.status(500).send("Error deleting parent");
        } else {
            res.redirect("/parents");
        }
    });
});



// Delete tutor route
app.get('/deleteTutor/:tutor_id', (req, res) => {
    const tutorId = req.params.tutor_id;
    const sql = "DELETE FROM tutors WHERE tutor_id = ?";
    connection.query(sql, [tutorId], (error, results) => {
        if (error) {
            console.error("Error deleting tutor:", error.message);
            return res.status(500).send("Error deleting tutor.");
        }
        console.log(`Tutor with ID ${tutorId} deleted successfully.`);
        res.redirect('/tutors');
    });
});


// Get all parents route
app.get('/parents', (req, res) => {
    const sql = "SELECT * FROM parents";
    connection.query(sql, (error, results) => {
        if (error) {
            console.error("Error fetching parents:", error.message);
            return res.status(500).send("Error fetching parents");
        }
        res.render("parents", { parents: results });
    });
});

// Add parent form route
app.get('/addParent', (req, res) => {
    res.render('addParent');
});

// Signup parent route
app.post('/signup/parent', (req, res) => {
    const { name, email, phone, address, password, childName } = req.body;

    // Insert into MySQL
    const sql = 'INSERT INTO parents (name, email, phone, address, password, childName) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(sql, [name, email, phone, address, password, childName], (err, result) => {
        if (err) throw err;
        console.log(result);
        // Redirect to /parents after successful signup
        res.redirect('/parents');
    });
});

// Get all reviews route
app.get('/reviews', (req, res) => {
    const sql = "SELECT * FROM reviews";
    connection.query(sql, (error, results) => {
        if (error) {
            console.error("Error fetching reviews:", error.message);
            return res.status(500).send("Error fetching reviews");
        }
        res.render("reviews", { reviews: results });
    });
});

// Route to render the login form
app.get('/entry', (req, res) => {
    res.render('entry');
});

// Route to handle login form submission
app.post('/entry', (req, res) => {
    const { email, password } = req.body;

    // Query to check in parents table
    const sqlParents = "SELECT * FROM parents WHERE email = ? AND password = ?";
    connection.query(sqlParents, [email, password], (errorParents, resultsParents) => {
        if (errorParents) {
            console.error("Error querying parents:", errorParents);
            return res.status(500).send("Internal Server Error");
        }

        // Query to check in tutors table
        const sqlTutors = "SELECT * FROM tutors WHERE email = ? AND password = ?";
        connection.query(sqlTutors, [email, password], (errorTutors, resultsTutors) => {
            if (errorTutors) {
                console.error("Error querying tutors:", errorTutors);
                return res.status(500).send("Internal Server Error");
            }

            // Check if credentials match either parents or tutors
            if (resultsParents.length > 0) {
                // Redirect to parents page if credentials match
                return res.redirect('/parents');
            } else if (resultsTutors.length > 0) {
                // Redirect to tutors page if credentials match
                return res.redirect('/tutors');
            } else {
                // If no match, redirect back to login page with error
                return res.redirect('/entry');
            }
        });
    });
});


// Enquiry route
app.get("/enquiry", (req, res) => {
    res.render("enquiry");
});

app.get("/", (req, res) => {
    res.render("index");
});

// Handle enquiry form submission
app.post("/enquiry", (req, res) => {
    const { name, email, phone, message } = req.body;

    // Insert into MySQL
    const sql = 'INSERT INTO enquiries (name, email, phone, message) VALUES (?, ?, ?, ?)';
    connection.query(sql, [name, email, phone, message], (err, result) => {
        if (err) {
            console.error("Error adding enquiry:", err);
            return res.status(500).send("Error adding enquiry");
        }
        console.log("Enquiry added successfully:", result);
        res.redirect("/enquiry"); // Redirect to enquiry form page after successful submission
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
