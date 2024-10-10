const {stopTheGame} = require("../../utils/gameFightsLogic")
const checkAndCleanLobbies = (client) => {
    setInterval(async () => {
    for (const [userId, lobby] of Object.entries(client.lobbies)) {
        if(lobby?.firstCheck){
            lobby.firstCheck = false;
            continue;
        }
        if (lobby.step !== 'complete') {
            const channel = client.channels.cache.get(lobby.channelId);
            if (!lobby.failCount) {
                lobby.failCount = 1;
                
            } else {
                lobby.failCount++;
            }
            if(channel){
                await channel.send(`# تم اكتشاف عدم تفاعل , سيتم حذف الغرفة بعد ${(3 - lobby.failCount) * 60} ثانية في حال عدم اختيار الاعدادات`);
            }
            console.log(`first fail ! ${lobby.failCount}`)
            if (lobby.failCount >= 3) {
                const channel = client.channels.cache.get(lobby.channelId);
                if (channel) {
                    stopTheGame(channel, userId, client);
                } else {
                    delete client.lobbies[userId];
                }
            }
        } else {
            lobby.failCount = 0;
        }
    }
    }, 60000); // Run every 60 seconds (1 minute)
};




/**
 * 
 * @param {Client} client 
 */
const execute = async(client)=>{
    checkAndCleanLobbies(client);
}

module.exports = {
    execute
}