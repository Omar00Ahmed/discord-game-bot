const { Emoji, Client } = require("discord.js")

const NumbersEmogieIds = [
    "1292226753695187086",
    "1292224583822217236",
    "1292224665753878649",
    "1292224682430304297",
    "1292224696141742221",
    "1292224709467050074",
    "1292224720938471474",
    "1292224734045405334",
    "1292224748989976607",
    "1292224762264948788",
    "1292224776483635261",
    "1292224789771063296",
    "1292224810062974976",
    "1292224829881061398",
    "1292224848772468778",
    "1292224867801894943"    
]

//loading all emogies and assign them in the client 
/**
 * 
 * @param {Client} client 
 */
const execute = async(client)=>{
    client.NumbersEmo = NumbersEmogieIds;
    console.log(`All emojis loaded successfully ${client.NumbersEmo}`)
}

module.exports = {
    execute
}