const mongoose = require("mongoose");
const { createNewGuild } = require("../../mongoose/utils/GuildManager");
// const connectionString = process.env.MONGODB_URI_STRING;

var username = encodeURIComponent(process.env.MONGODB_USERNAME);
var password = encodeURIComponent(process.env.MONGODB_PASSWORD);
var HOST = encodeURIComponent(process.env.MONGODB_HOST)
var connectionString = `mongodb://${username}:${password}@${HOST}/?authSource=admin`;

const execute = async (client)=>{
    mongoose.connect(connectionString, {
        dbName:"wnsasettings"
    })
    .then(() => {
        console.log('Connected to MongoDB');
        // createNewGuild("54621621356","-")
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB', err);
    });
}

module.exports = {
    execute,
}