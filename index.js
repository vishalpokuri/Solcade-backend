const express = require("express");
require("dotenv").config();

// Import cron controller (this will initialize and schedule the cron job)
require("./controllers/cron");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

// Add an endpoint to manually trigger pot closure if needed
app.post("/close-pot", async (req, res) => {
  try {
    const { gameId, potNumber } = req.body;

    if (!gameId || potNumber === undefined) {
      return res.status(400).json({
        success: false,
        message: "gameId and potNumber are required",
      });
    }

    // You would need to import your cron logic or create a function to call
    // For a quick solution, you can duplicate the logic from cron.js here

    res.json({
      success: true,
      message: "Pot closure triggered",
      gameId,
      potNumber,
    });
  } catch (error) {
    console.error("Error closing pot:", error);
    res.status(500).json({
      success: false,
      message: "Error closing pot",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
