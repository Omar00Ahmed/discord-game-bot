async function execute(message,client){
    if(message.author.bot) return; // Ignore bot messages
    if(!message.content.startsWith("$$")) return;
    
    const args = message.content.slice("$$".length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if(command === "test"){
        message.channel.send("Test command executed successfully!");
        console.log("Test command executed in channel: " + message.channel.name);
    }

}

module.exports = {
    execute: execute
}