// importuri
import express from "express";
import cors from "cors";
import { exec } from "child_process";
import Database from "better-sqlite3";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors()); // permite lucrul cu domenii diferite
app.use(express.json()); // pentru format JSON
app.use(express.static("public")); // referinta la server pentru fisiere

// fisiere manipulate
const DB_FILE = "./public/data/production_data.db";
const BOS_JSON_PATH = "./public/data/BOS.json";
const NM_JSON_PATH = "./public/data/NM.json";
const NEWS_JSON_PATH = "./public/data/news.json";

// pentru functia de drag&drop
const uploadsDir = "./public/uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// initiaza spatiul de stocare pentru drag&drop
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/uploads");
  },
  filename: (req, file, cb) => {
    // Map endpoints to specific filenames
    const filenameMap = {
      "/upload-bos": "Formular BOS",
      "/upload-nm": "Formular NM",
      "/upload-production-plan": "productionPlan",
      "/upload": "excelMare",
    };

    // Find which endpoint this request is for
    const endpoint = Object.keys(filenameMap).find((key) =>
      req.originalUrl.includes(key)
    );

    const uniqueSuffix = endpoint
      ? filenameMap[endpoint]
      : "Formular raportare eveniment la limita producerii unui accident sau situație periculoasă";

    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// referinta drag&drop
const upload = multer({ storage });

// fetch date GE
function fetchData(date) {
  const db = new Database(DB_FILE, { readonly: true });
  const metadata = db
    .prepare("SELECT * FROM metadata WHERE date = ?")
    .get(date);
  const operational_losses = db
    .prepare("SELECT * FROM operational_losses WHERE date = ?")
    .all(date);
  const minor_stoppages = db
    .prepare("SELECT * FROM minor_stoppages WHERE date = ?")
    .all(date);
  const breakdowns = db
    .prepare("SELECT * FROM breakdowns WHERE date = ?")
    .all(date);
  const inceput = db.prepare("SELECT * FROM inceput WHERE date = ?").all(date);
  const production_plan = db
    .prepare("SELECT * FROM production_plan WHERE date = ?")
    .all(date);
  const rapoarte = db
    .prepare("SELECT * FROM rapoarte WHERE date = ?")
    .all(date);
  db.close();
  return {
    metadata,
    operational_losses,
    minor_stoppages,
    breakdowns,
    inceput,
    production_plan,
    rapoarte,
  };
}

// endpointuri GET

// endpoint sa preia date section manager production pentru log viewer
app.get("/section-manager-production/:date", (req, res) => {
  try {
    const date = req.params.date;

    // Validate date format (YYYYMMDD)
    const dateRegex = /^\d{8}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid date format. Use YYYYMMDD",
      });
    }

    const db = new Database(DB_FILE, { readonly: true });

    // Query the section_manager_production table for the specific date
    const productionData = db
      .prepare(
        "SELECT * FROM section_manager_production WHERE date = ? ORDER BY id"
      )
      .all(date);

    db.close();

    if (productionData.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No production data found for the specified date",
        data: [], // Return empty array instead of no data property
      });
    }

    res.json({
      status: "success",
      data: productionData,
      count: productionData.length,
    });
  } catch (err) {
    console.error("Error fetching section manager production data:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Optional: Endpoint to get section manager production data for a date range
app.get("/section-manager-production-range", (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate date formats
    const dateRegex = /^\d{8}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid date format. Use YYYYMMDD",
      });
    }

    const db = new Database(DB_FILE, { readonly: true });

    // Query for date range
    const productionData = db
      .prepare(
        "SELECT * FROM section_manager_production WHERE date BETWEEN ? AND ? ORDER BY date, id"
      )
      .all(startDate, endDate);

    db.close();

    res.json({
      status: "success",
      data: productionData,
      count: productionData.length,
    });
  } catch (err) {
    console.error("Error fetching section manager production data range:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Optional: Endpoint to get available dates for section manager production
app.get("/available-production-dates", (req, res) => {
  try {
    const db = new Database(DB_FILE, { readonly: true });

    const availableDates = db
      .prepare(
        "SELECT DISTINCT date FROM section_manager_production ORDER BY date DESC"
      )
      .all()
      .map((row) => row.date);

    db.close();

    res.json({
      status: "success",
      data: availableDates,
      count: availableDates.length,
    });
  } catch (err) {
    console.error("Error fetching available production dates:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// endpoint sa ruleze scriptul python
app.get("/run-script", (req, res) => {
  exec("python scripts/export_json.py", (err, stdout, stderr) => {
    if (err) {
      console.error("Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log("Script executed:", stdout);
    res.json({ message: "Script executed successfully", output: stdout });
  });
});

// endpoint sa preia date GE, in functie de data
app.get("/data/:date", (req, res) => {
  try {
    const date = req.params.date;
    const data = fetchData(date);
    if (!data.metadata) {
      return res
        .status(404)
        .json({ status: "error", message: "Date not found in DB" });
    }
    res.json({ status: "success", data });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// endpoint sa preia date BOS
app.get("/bos-data", (req, res) => {
  try {
    // Create default file if it doesn't exist
    if (!fs.existsSync(BOS_JSON_PATH)) {
      const defaultData = {
        actiuni_sigure: 0,
        actiuni_nesigure: 0,
      };
      fs.writeFileSync(BOS_JSON_PATH, JSON.stringify(defaultData, null, 2));
    }

    const data = JSON.parse(fs.readFileSync(BOS_JSON_PATH, "utf8"));
    res.json({ status: "success", data });
  } catch (err) {
    console.error("Error reading BOS data:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// endpoint sa preia date BOS, in functie de data
app.get("/bos-data/:date", (req, res) => {
  try {
    if (!fs.existsSync(BOS_JSON_PATH)) {
      return res
        .status(404)
        .json({ status: "error", message: "BOS data not found" });
    }

    const data = JSON.parse(fs.readFileSync(BOS_JSON_PATH, "utf8"));
    res.json({ status: "success", data });
  } catch (err) {
    console.error("Error reading BOS data:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// endpoint sa preia stiri
app.get("/news", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(NEWS_JSON_PATH, "utf8"));
    res.json({ status: "success", data });
  } catch (err) {
    console.error("Error reading news data:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// endpoint sa preia nm
app.get("/nm-data", (req, res) => {
  try {
    // Create default file if it doesn't exist
    if (!fs.existsSync(NM_JSON_PATH)) {
      const defaultData = {
        actiuni_sigure: 0,
        actiuni_nesigure: 0,
      };
      fs.writeFileSync(NM_JSON_PATH, JSON.stringify(defaultData, null, 2));
    }
    const data = JSON.parse(fs.readFileSync(NM_JSON_PATH, "utf8"));
    res.json({ status: "success", data });
  } catch (err) {
    console.error("Error reading NM data:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// NEW: Endpoint to get monthly data for graphs
app.get("/data/month/:month", (req, res) => {
  try {
    const month = req.params.month;

    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid month format. Use YYYY-MM",
      });
    }

    // Convert YYYY-MM to YYYYMM format for database query
    const dbMonth = month.replace("-", "");

    const db = new Database(DB_FILE, { readonly: true });

    // First, let's check what operations actually exist in the database
    const availableOperations = db
      .prepare(
        `
      SELECT DISTINCT operatie
      FROM inceput
      WHERE date LIKE ?
    `
      )
      .all(`${dbMonth}%`);

    console.log(
      "Available operations for month",
      month,
      ":",
      availableOperations
    );

    // Fetch all data for the specified month to see what's available
    const allData = db
      .prepare(
        `
      SELECT date, operatie, valoare
      FROM inceput
      WHERE date LIKE ?
      ORDER BY date, operatie
    `
      )
      .all(`${dbMonth}%`);

    console.log("All data for month", month, ":", allData.slice(0, 10)); // First 10 entries

    // Now let's get the specific data we need
    const data = db
      .prepare(
        `
      SELECT date, operatie, valoare
      FROM inceput
      WHERE date LIKE ?
      AND (operatie LIKE '%GE%' OR operatie LIKE '%Volume Produced%' OR operatie LIKE '%Waste%' OR operatie LIKE '%Speed Loss%')
      ORDER BY date, operatie
    `
      )
      .all(`${dbMonth}%`);

    db.close();

    res.json({
      status: "success",
      data: data,
      message:
        data.length > 0
          ? `Found ${data.length} entries for ${month}`
          : `No data found for ${month}. Available operations: ${availableOperations
              .map((op) => op.operatie)
              .join(", ")}`,
    });
  } catch (err) {
    console.error("Error fetching monthly data:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// endpointuri POST

// NEW: Endpoint to update header comments (Breakdowns, Minor Stoppages, Operational Losses)
app.post("/update-header-comment", (req, res) => {
  try {
    const { date, headerType, equipmentIndex, comment } = req.body;

    console.log(
      `Updating header comment: ${date}, ${headerType}, ${equipmentIndex}, ${comment}`
    );

    if (
      !date ||
      !headerType ||
      equipmentIndex === undefined ||
      equipmentIndex === null
    ) {
      return res.status(400).json({
        status: "error",
        message: "Date, headerType, and equipmentIndex are required",
      });
    }

    const db = new Database(DB_FILE);

    // Map header types to table names
    const tableMapping = {
      minor_stoppages: "minor_stoppages",
      breakdowns: "breakdowns",
      operational_losses: "operational_losses",
      "minor stoppages": "minor_stoppages",
      "operational losses": "operational_losses",
    };

    const tableName = tableMapping[headerType];

    if (!tableName) {
      db.close();
      return res.status(400).json({
        status: "error",
        message: `Invalid header type: ${headerType}`,
      });
    }

    // Get all entries for the specified date and header type
    const entries = db
      .prepare(`SELECT * FROM ${tableName} WHERE date = ?`)
      .all(date);

    // Check if index is valid
    if (equipmentIndex < 0 || equipmentIndex >= entries.length) {
      db.close();
      return res.status(400).json({
        status: "error",
        message: `Invalid equipment index: ${equipmentIndex}. Available indices: 0-${
          entries.length - 1
        }`,
      });
    }

    const entryId = entries[equipmentIndex].id;

    // Update the comment in the database
    const result = db
      .prepare(`UPDATE ${tableName} SET comentariu = ? WHERE id = ?`)
      .run(comment, entryId);

    db.close();

    if (result.changes === 0) {
      return res.status(404).json({
        status: "error",
        message: "No entry found to update",
      });
    }

    console.log(
      `Successfully updated comment for ${tableName}[${equipmentIndex}]`
    );
    res.json({
      status: "success",
      message: "Comment updated successfully",
    });
  } catch (err) {
    console.error("Error updating header comment:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
});

// endpoint sa adauge date bos
app.post("/update-bos-data", (req, res) => {
  try {
    const { actiuni_sigure, actiuni_nesigure } = req.body;

    const data = {
      actiuni_sigure: parseInt(actiuni_sigure) || 0,
      actiuni_nesigure: parseInt(actiuni_nesigure) || 0,
    };

    // Save back to file
    fs.writeFileSync(BOS_JSON_PATH, JSON.stringify(data, null, 2));

    res.json({
      status: "success",
      message: "BOS data updated successfully",
      data,
    });
  } catch (err) {
    console.error("Error updating BOS data:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// endpoint sa adauge date nm
app.post("/update-nm-data", (req, res) => {
  try {
    const { near_miss, unsafe_condition } = req.body;

    const data = {
      near_miss: parseInt(near_miss) || 0,
      unsafe_condition: parseInt(unsafe_condition) || 0,
    };

    // Save back to file
    fs.writeFileSync(NM_JSON_PATH, JSON.stringify(data, null, 2));

    res.json({
      status: "success",
      message: "NM data updated successfully",
      data,
    });
  } catch (err) {
    console.error("Error updating NM data:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// endpoint sa adauge comentarii
app.post("/update-comments", (req, res) => {
  try {
    const { cardIndex, comment, date } = req.body;
    const db = new Database(DB_FILE);
    const rows = db.prepare("SELECT * FROM inceput WHERE date = ?").all(date);
    if (!rows[cardIndex]) {
      db.close();
      return res.status(400).json({
        status: "error",
        message: "Invalid card index or missing data",
      });
    }
    const id = rows[cardIndex].id;
    db.prepare("UPDATE inceput SET valoare = ? WHERE id = ?").run(comment, id);
    db.close();
    res.json({ status: "success", message: "Comment updated successfully" });
  } catch (err) {
    console.error("Error updating comment:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Eendpoint sa adauge drag&drop
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ status: "error", message: "No file uploaded" });
    }

    // You might want to do something with the uploaded file here
    console.log("File uploaded:", req.file.filename);

    res.json({
      status: "success",
      message: "File uploaded successfully",
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    console.error("Error uploading file:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// NEW: Endpoint to post BOS data
app.post("/process-bos", (req, res) => {
  try {
    // Run Python script to process BOS file
    exec("python scripts/export_json.py", (err, stdout, stderr) => {
      if (err) {
        console.error("Error processing BOS:", err);
        return res.status(500).json({ status: "error", message: err.message });
      }

      // Read the updated BOS data
      if (fs.existsSync(BOS_JSON_PATH)) {
        const data = JSON.parse(fs.readFileSync(BOS_JSON_PATH, "utf8"));
        res.json({ status: "success", message: "BOS data processed", data });
      } else {
        res.json({
          status: "success",
          message: "BOS processed but no data file found",
          output: stdout,
        });
      }
    });
  } catch (err) {
    console.error("Error processing BOS:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/upload-bos", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ status: "error", message: "No file uploaded" });
    }

    // You might want to do something with the uploaded file here
    console.log("File uploaded:", req.file.filename);

    res.json({
      status: "success",
      message: "File uploaded successfully",
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    console.error("Error uploading file:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/process-nm", (req, res) => {
  try {
    // Run Python script to process NM file
    exec("python scripts/export_json.py", (err, stdout, stderr) => {
      if (err) {
        console.error("Error processing NM:", err);
        return res.status(500).json({ status: "error", message: err.message });
      }

      // Read the updated NM data
      if (fs.existsSync(NM_JSON_PATH)) {
        const data = JSON.parse(fs.readFileSync(NM_JSON_PATH, "utf8"));
        res.json({ status: "success", message: "NM data processed", data });
      } else {
        res.json({
          status: "success",
          message: "NM processed but no data file found",
          output: stdout,
        });
      }
    });
  } catch (err) {
    console.error("Error processing NM:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/upload-nm", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ status: "error", message: "No file uploaded" });
    }

    // You might want to do something with the uploaded file here
    console.log("File uploaded:", req.file.filename);

    res.json({
      status: "success",
      message: "File uploaded successfully",
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    console.error("Error uploading file:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// NEW: Endpoint to post production plan
app.post("/upload-production-plan", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ status: "error", message: "No file uploaded" });
    }

    // You might want to do something with the uploaded file here
    console.log("File uploaded:", req.file.filename);

    res.json({
      status: "success",
      message: "File uploaded successfully",
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
    });
  } catch (err) {
    console.error("Error uploading file:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// endpoint sa adauge raport
app.post("/add-raport", (req, res) => {
  try {
    const { date, raport } = req.body;
    const db = new Database(DB_FILE);
    db.prepare(
      "INSERT INTO rapoarte (date, oraIn, oraOut, zona, tip, tipSecundar, masina, ansamblu, problema) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      date,
      raport.oraIn,
      raport.oraOut,
      raport.zona,
      raport.tip,
      raport.tipSecundar,
      raport.masina,
      raport.ansamblu,
      raport.problema
    );
    db.close();
    res.json({ status: "success", message: "Raport added successfully!" });
  } catch (err) {
    console.error("Error adding raport:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// endpoint sa stearga raport
app.post("/delete-raport", (req, res) => {
  try {
    const { date, raportIndex } = req.body;

    const db = new Database(DB_FILE);

    // Get all reports for that date
    const reports = db
      .prepare("SELECT * FROM rapoarte WHERE date = ?")
      .all(date);

    // Check if index is valid
    if (raportIndex < 0 || raportIndex >= reports.length) {
      db.close();
      return res
        .status(400)
        .json({ status: "error", message: "Invalid report index" });
    }

    const reportId = reports[raportIndex].id;

    // Delete report by id
    db.prepare("DELETE FROM rapoarte WHERE id = ?").run(reportId);

    db.close();
    res.json({ status: "success", message: "Raport deleted successfully!" });
  } catch (err) {
    console.error("Error deleting raport:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

//newly add for news
// NEW: Endpoint to update news messages
app.post("/update-news", (req, res) => {
  try {
    const { messages } = req.body;

    // Validate input
    if (!Array.isArray(messages)) {
      return res.status(400).json({
        status: "error",
        message: "Messages must be an array",
      });
    }

    // Convert to the expected format: array of objects with message property
    const newsData = messages.map((message) => ({ message }));

    // Save to file
    fs.writeFileSync(NEWS_JSON_PATH, JSON.stringify(newsData, null, 2));

    res.json({
      status: "success",
      message: "News updated successfully",
      data: newsData,
    });
  } catch (err) {
    console.error("Error updating news:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// NEW: Endpoint to add a news message
app.post("/add-news", (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        status: "error",
        message: "Message is required and must be a string",
      });
    }

    // Read existing news
    let newsData = [];
    if (fs.existsSync(NEWS_JSON_PATH)) {
      const fileContent = fs.readFileSync(NEWS_JSON_PATH, "utf8");
      newsData = JSON.parse(fileContent);
    }

    // Add new message
    newsData.push({ message });

    // Save back to file
    fs.writeFileSync(NEWS_JSON_PATH, JSON.stringify(newsData, null, 2));

    res.json({
      status: "success",
      message: "News added successfully",
      data: newsData,
    });
  } catch (err) {
    console.error("Error adding news:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// NEW: Endpoint to delete a news message
app.post("/delete-news", (req, res) => {
  try {
    const { index } = req.body;

    if (typeof index !== "number" || index < 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid index is required",
      });
    }

    // Read existing news
    let newsData = [];
    if (fs.existsSync(NEWS_JSON_PATH)) {
      const fileContent = fs.readFileSync(NEWS_JSON_PATH, "utf8");
      newsData = JSON.parse(fileContent);
    }

    // Check if index is valid
    if (index >= newsData.length) {
      return res.status(400).json({
        status: "error",
        message: "Index out of bounds",
      });
    }

    // Remove the message at the specified index
    newsData.splice(index, 1);

    // Save back to file
    fs.writeFileSync(NEWS_JSON_PATH, JSON.stringify(newsData, null, 2));

    res.json({
      status: "success",
      message: "News deleted successfully",
      data: newsData,
    });
  } catch (err) {
    console.error("Error deleting news:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
