const { Client,ChannelType,PermissionsBitField,Message,EmbedBuilder } = require('discord.js');
const {prefix} = require("../../utils/MessagePrefix")
const {LeaderSettings} = require("../../components/LeaderSettings");
const {stopTheGame} = require("../../utils/gameFightsLogic");
const { Sleep } = require('../../utils/createDelay');
const { checkIfCanMute } = require('../../utils/WhoCanMute');

/**
 * @param {Message} message The date
 */
async function execute(message,client) {
    if (message.author.bot) return; // Ignore bot messages

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if(!message.content.startsWith(prefix))return
    
    
    // Command to create a private channel
    switch (command) {
        case 'قتال':
            handleCreateRoom(message,client);
            break;
        case 'هدنة':
            handleRemoveRoom(message,client);
            break;
    
    }}

async function handleCreateRoom(message,client){
    const channelName = `${message.author.username}-gameroom`; // Extract channel name
    const theLobby = client?.lobbies[message.author.id];
    const lobbyChannel = theLobby?.channelId ? await client.channels.fetch(theLobby.channelId).catch(() => null) : null
    if(theLobby?.channelId){
        if(theLobby && !lobbyChannel){
            await stopTheGame(lobbyChannel, theLobby.owner, client, theLobby);
        }
    }
    if(theLobby && lobbyChannel){
        return message.reply("لقد قمت بإنشاء غرفة بالفعل من قبل , برجاء حذف الغرفة السابقة");
    }

    if (!channelName) {
        return message.reply('Please provide a channel name!');
    }

    if(message.channel.id != "1291124084012351499"){
        return message.reply(`برجاء كتابة الامر في <#1291124084012351499>`);
    }


    try {
        // Create a new text channel with permissions
        const channel = await message.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            // parent:"1291122949432148073",
            parent:"1291122949432148073",
            permissionOverwrites: [
                {
                    id: message.guild.id, // Deny access to @everyone
                    allow: [PermissionsBitField.Flags.SendMessages],
                },
            ],
        });
    
        client.lobbies[message.author.id] = {
            startTimeOut:null,
            owner:message.author.id,
            channelId: channel.id,
            firstCheck:true,
            // lobbyDeleter: setTimeout(() => {
            //     stopTheGame(channel,message.author.id,client)
            // }, 1000 * 60 * 2)
        };


        const lobby = {
            players: [],
            maxPlayers: 4,
            step:"players",
            team1: [`${message.author.id}`],
            team2: []
        };

        const {embed,components} = LeaderSettings(lobby,message.author.id)

        // Send settings message 
        await channel.send({ embeds: [embed], components: components });
    
    
        // Create a new embed for game description
        const gameDescriptionEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('وصف اللعبة')
            .setDescription(`طريقة اللعب:\n1- شارك في اللعبة بالضغط على الزر أدناه.\n2- على صاحب اللعبة أن يقوم بتحديد الإعدادات المناسبة.\n3- قم بإختيار إحدى الفريقين للمشاركة في اللعبة.\n4- في كل جولة ، ستظهر اسئلة عند الإجابة عليها سيتم إضافة نقطة لفريقك.\n5- بإمكان الفريق إقصاء لاعب من الفريق الآخر عند وصوله إلى عدد نقاط يقوم صاحب اللعبة بتحديدها.\n6- إذا تم طرد جميع أعضاء الفريق المنافس سيفوز الفريق او اذا وصل الي عدد النقط المحدد .`)
            .addFields(
                { name: 'الهدف', value: 'تشكيل فريقين والتنافس ضد بعضهما البعض.' },
                { name: 'اللاعبون', value: 'يمكن لما يصل إلى 30 لاعبين الانضمام إلى هذه اللعبة.' },
            )
            .setFooter({ text: 'استمتع وحظًا سعيدًا!' });
                

        const sentMessage1 =  await message.reply({
            embeds: [gameDescriptionEmbed],
        });
        const sentMessage2 = await message.channel.send({
            content:`# قام اللاعب ${message.author} بإنشاء غرفة اضغط ${channel} للإنضمام`
        })
        // Delete messages after 10 seconds
        setTimeout(async () => {
            try {
                await sentMessage1.delete();
                await sentMessage2.delete();
                await message.delete();
            } catch (error) {
                console.error('Error deleting messages:', error);
            }
        }, 10000);
        
    } catch (error) {
        console.error('حدث خطأ اثناء انشاء الغرفة:', error);
        message.reply('حدث خطأ اثناء محاولة إنشاء الغرفة');
    }
}
async function handleRemoveRoom(message,client){

    const channelId = message.channel.id;
    const lobby = Object.values(client.lobbies).find(lobby => lobby.channelId === channelId);
    const member = message.member;
    if (lobby && (message.author.id === lobby.owner || message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) || checkIfCanMute(member,"develop")) ) {
    } 
    else {
        message.reply('عذرًا، يمكن فقط لصاحب الغرفة أو المشرف إزالة الغرفة.');
        return;
    }
    
    if (lobby) {
        const ownerId = lobby.owner;
        console.log(ownerId);
        await message.reply("جاري حذف الغرفة ..");
        await Sleep(2000)
        await stopTheGame(message.channel,ownerId,client);
    }
    
}

module.exports = {
    execute,
    
}