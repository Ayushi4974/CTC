const mongoose = require('mongoose');
const Package = require('./server/models/Package');
require('dotenv').config({path: './server/.env'});

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const pkgs = await Package.find();
  console.log(JSON.stringify(pkgs, null, 2));
  process.exit();
});
