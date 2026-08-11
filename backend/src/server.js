const express = require('express');

const app = express();

const PORT = 5000;

// Middleware
app.use(express.json());

app.get ("/", (req, res)=>{
   res.json({
      message: "SamrtRent ET Backend API",
   });
});

app.listen(PORT, (req, res)=>{
    console.log(`Server is running on port ${PORT}`);
});