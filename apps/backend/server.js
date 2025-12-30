// server.js
require("dotenv").config();

const app = require("./src/app");

const PORT = Number(process.env.PORT || 10000);

app.listen(PORT, () => {
  console.log(`FlanSync API escuchando en puerto ${PORT}`);
});
