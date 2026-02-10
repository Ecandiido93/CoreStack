import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("🚀 CoreStack API running");
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 CoreStack API running on port ${PORT}`);
});
