const pool = require("../config/db");

exports.healthCheck = async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Backend + Database connected",
      time: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      error: "Database connection failed",
      details: error.message
    });
  }
};
