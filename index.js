const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();

//middlewares//
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//routes//
app.get("/items", (req, res) => {
  res.send([]);
});

app.listen(8080, () => console.log("App is listening at port 8080"));
