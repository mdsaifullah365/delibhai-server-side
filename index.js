const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Port Listening
app.listen(port, () => {
  console.log("deliBhai server is running...");
});
