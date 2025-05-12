const cron = require("node-cron");
const axios = require("axios");

// Stateful tracker for potNumber (always gets the latest pot number)
let potNumber;
const GAME_ID = "flappy_bird"; // or get dynamically if needed

cron.schedule("*/1 * * * *", async () => {
  console.log(`Cron triggered at ${new Date().toISOString()}`);

  //1. Get the current potId, gameId

  //Flow
  /*
  1. I will initialize one pot, and then when I start this cron job, the pot will be closed immediately. 

  2. Lets fetch the details
  
  


*/
  f; //This is for latest pot number fetch
  try {
    const response = await axios.get(
      `http://localhost:3001/pot/latest/${GAME_ID}`
    );
    potNumber = response.pot.potNumber;
  } catch (e) {
    console.error(e);
  }

  try {
    // Close previous pot
    if (potNumber > 1) {
      await axios.post(`http://localhost:3001/pot/close`, {
        gameId: GAME_ID,
        potNumber: potNumber,
      });
      console.log(`Closed pot ${potNumber - 1}`);
    }

    // Initialize new pot
    await axios.post("http://localhost:3001/pot/initialize", {
      gameId: GAME_ID,
      potNumber: potNumber,
    });
    console.log(`Initialized pot ${potNumber}`);

    potNumber++; // Move to next pot
  } catch (err) {
    console.error("Cron job error:", err.response?.data || err.message);
  }
});
