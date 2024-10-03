const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const theQuestions = require('../public/data/questions.json');
const { Sleep } = require('./createDelay');
const { createImage } = require('./createImage');

const questions = theQuestions;
const questionsMemo = new Map();

async function startGame(interaction, lobby, client) {
    await interaction.channel.send("بدء اللعبة!");
    console.log(lobby);

    // Save the original team compositions
    const originalTeam1 = [...lobby.team1];
    const originalTeam2 = [...lobby.team2];

    const gameState = {
        scores: { team1: 0, team2: 0 },
        currentQuestion: null,
        gameEnded: false,
        blacklist: new Set(),
        kickVotes: {},
        roundsThreshold:0
    };

    // Give access to send messages for all team members
    await giveMessageAccess(interaction.channel, [...lobby.team1, ...lobby.team2]);

    while (!gameState.gameEnded) {
        const [team1Player, team2Player] = selectRandomPlayers(lobby, gameState.blacklist);

        if (!team1Player || !team2Player) {
            gameState.blacklist.clear(); // Reset blacklist if all players have played
            continue;
        }
        interaction.channel.send(`السؤال التالي بعد 2 ثواني .. <@${team1Player}> - <@${team2Player}>`)
        await Sleep(2000)

        await askQuestion(lobby,interaction.channel, gameState, team1Player, team2Player);
        const winner = await waitForAnswer(interaction.channel, gameState, team1Player, team2Player);
        gameState.blacklist.add(team1Player).add(team2Player);
        if (winner) {
            const winningTeam = lobby.team1.includes(winner) ? 'team1' : 'team2';
            gameState.scores[winningTeam]++;
            
            if (lobby.kickAllowed && gameState.scores[winningTeam] % lobby.kickRounds === 0) {
                await offerKick(interaction.channel, winner, winningTeam === 'team1' ? lobby.team2 : lobby.team1, gameState, lobby, interaction, client);
            }

            if (lobby.team1.length === 0) {
                gameState.gameEnded = true;
                // gameState.scores.team2 = lobby.winningPoints;
            } else if (lobby.team2.length === 0) {
                gameState.gameEnded = true;
                // gameState.scores.team1 = lobby.winningPoints;
            }
        }

        if (gameState.scores.team1 >= lobby.winningPoints || gameState.scores.team2 >= lobby.winningPoints) {
            gameState.gameEnded = true;
        }
        
    }

    await announceWinner(interaction.channel, gameState, lobby);
    await offerRestartOrRemove(interaction, lobby, client, originalTeam1, originalTeam2);

    // Clean up
    delete client.lobbies[interaction.message.id];
    if (client.countdownIntervals[interaction.message.id]) {
        clearInterval(client.countdownIntervals[interaction.message.id]);
        delete client.countdownIntervals[interaction.message.id];
    }
}

async function giveMessageAccess(channel, players) {
    for (const playerId of players) {
        await channel.permissionOverwrites.edit(playerId, {
            SendMessages: true
        });
    }
}

async function removeMessageAcess(channel,player){
    await channel.permissionOverwrites.edit(player, {
        SendMessages: false
    });
}


function selectRandomPlayers(lobby, blacklist) {
    const availableTeam1 = lobby.team1.filter(player => !blacklist.has(player));
    const availableTeam2 = lobby.team2.filter(player => !blacklist.has(player));

    if (availableTeam1.length === 0 || availableTeam2.length === 0) {
        return [null, null];
    }

    const team1Player = availableTeam1[Math.floor(Math.random() * availableTeam1.length)];
    const team2Player = availableTeam2[Math.floor(Math.random() * availableTeam2.length)];

    return [team1Player, team2Player];
}

async function askQuestion(lobby,channel, gameState, team1Player, team2Player) {
    if(!lobby) return;
    const randomCategory = lobby.categories[Math.floor(Math.random() * lobby.categories.length)]
    
    const categoryLength = questionsMemo?.randomCategory || Object.keys(theQuestions[randomCategory]).length;
    if (!questionsMemo[randomCategory]) {
        questionsMemo[randomCategory] = categoryLength;
    }
    const randomQuestion = theQuestions[randomCategory][Object.keys(theQuestions[randomCategory])[Math.floor(Math.random() * categoryLength)]];
    gameState.currentQuestion = randomQuestion;

    const attachment = await createImage(randomQuestion.question);
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('سؤال المسابقة')
        .setImage('attachment://image.png')
        .addFields(
            { name: 'النقاط لفريق 1', value: gameState.scores.team1.toString(), inline: true },
            { name: 'النقاط لفريق 2', value: gameState.scores.team2.toString(), inline: true }
        )
        .setFooter({ text: 'أول إجابة صحيحة تفوز بالنقطة!' });
    
        
        
    
    await Sleep(3000)
    
    await channel.send({ 
        content: `<@${team1Player}> <@${team2Player}>, إليكم السؤال:`,
        embeds: [embed],
        files: [await createImage(randomQuestion.question)]
    });
}

async function waitForAnswer(channel, gameState, team1Player, team2Player) {
    if(!channel) return;
    return new Promise((resolve) => {
        const filter = m => m.author.id === team1Player || m.author.id === team2Player;
        const collector = channel.createMessageCollector({ filter, time: 23000 });

        collector.on('collect', async (msg) => {
            if (checkAnswer(msg.content, gameState.currentQuestion.answer)) {
                collector.stop('correct');
                const winningTeam = msg.author.id === team1Player ? 'team1' : 'team2';
                await channel.send(`إجابة صحيحة! <@${msg.author.id}> يسجل نقطة لفريق ${winningTeam === 'team1' ? 'فريق 1' : 'فريق 2'}!`);
                resolve(msg.author.id);
            }
        });

        collector.on('end', async (collected, reason) => {
            if(!channel) return;
            if (reason === 'time') {
                channel.send("انتهى الوقت! لم يجب أحد بشكل صحيح.");
                resolve(null);
            }
        });
    });
}

function checkAnswer(userAnswer, correctAnswer) {
    return correctAnswer.some(answer => userAnswer.toLowerCase().trim() === answer.toLowerCase().trim());
}

async function offerKick(channel, winner, oppositeTeam, gameState, lobby, interaction, client) {
    if(!channel || !lobby) return;
    if (oppositeTeam.length === 1) {
        const kickedPlayer = oppositeTeam[0];
        const teamToUpdate = oppositeTeam === lobby.team1 ? 'team1' : 'team2';
        lobby[teamToUpdate] = lobby[teamToUpdate].filter(p => p !== kickedPlayer);
        await channel.send(`<@${kickedPlayer}> تم إقصاؤه من اللعبة تلقائيًا لأنه اللاعب الأخير في فريقه!`);
        
        gameState.gameEnded = true;
        const winningTeam = teamToUpdate === 'team1' ? 'team2' : 'team1';
        gameState.scores[winningTeam] = gameState.scores[winningTeam];
        
        return;
    }

    const winningTeam = lobby.team1.includes(winner) ? lobby.team1 : lobby.team2;
    const playerNames = await createUserArray(oppositeTeam, client);

    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('فرصة للإقصاء!')
        .setDescription(`فريق الفائز، لديكم فرصة للتصويت على إقصاء لاعب من الفريق المنافس. اختاروا لاعبًا للإقصاء:`)
        .setFooter({ text: 'لديكم 10 ثوانٍ للتصويت' });

    const row = new ActionRowBuilder()
        .addComponents(
            playerNames.map(player => 
                new ButtonBuilder()
                    .setCustomId(`kick_${player.playerId}`)
                    .setLabel(`إقصاء ${player.name}`)
                    .setStyle(ButtonStyle.Primary)
            )
        );

    const kickMessage = await channel.send({ embeds: [embed], components: [row] });

    const votes = {};
    playerNames.forEach(player => {
        votes[player.playerId] = 0;
    });

    const filter = i => winningTeam.includes(i.user.id) && i.customId.startsWith('kick_');
    const collector = kickMessage.createMessageComponentCollector({ filter, time: 10000 });

    let voteCountMessage = await channel.send("عدد الأصوات الحالي: ");

    const updateVoteCount = async () => {
        const voteCountString = playerNames.map(player => 
            `${player.name}: ${votes[player.playerId]}`
        ).join(' | ');
        await voteCountMessage.edit(`عدد الأصوات الحالي: ${voteCountString}`);
    };

    return new Promise((resolve) => {
        collector.on('collect', async i => {
            const votedPlayer = i.customId.split('_')[1];
            votes[votedPlayer]++;
            await updateVoteCount();
            await i.reply({ content: `تم التصويت على إقصاء <@${votedPlayer}>`, ephemeral: true });

            if (votes[votedPlayer] === winningTeam.length) {
                collector.stop('unanimous');
            }
        });

        collector.on('end', async (collected, reason) => {
            if(!kickMessage || !lobby) return;
            kickMessage.edit({ components: [] });
            if (reason === 'unanimous') {
                const kickedPlayer = Object.keys(votes).find(player => votes[player] === winningTeam.length);
                await kickPlayer(kickedPlayer, oppositeTeam, lobby, channel);
            } else {
                const maxVotes = Math.max(...Object.values(votes));
                const kickedPlayers = Object.keys(votes).filter(player => votes[player] === maxVotes);

                if (kickedPlayers.length === 1) {
                    await kickPlayer(kickedPlayers[0], oppositeTeam, lobby, channel);
                } else {
                    await channel.send("لم يتم إقصاء أي لاعب بسبب تعادل الأصوات.");
                }
            }

            await voteCountMessage.delete();
            resolve();
        });
    });
}

async function kickPlayer(playerId, oppositeTeam, lobby, channel) {
    if(!lobby) return;
    const teamToUpdate = oppositeTeam === lobby.team1 ? 'team1' : 'team2';
    lobby[teamToUpdate] = lobby[teamToUpdate].filter(p => p !== playerId);
    await channel.send(`<@${playerId}> تم إقصاؤه من اللعبة!`);
    removeMessageAcess(channel,playerId)
}

async function announceWinner(channel, gameState, lobby) {
    const winningTeam = gameState.scores.team1 > gameState.scores.team2 ? 'فريق 1' : 'فريق 2';
    const winningPlayers = winningTeam === 'فريق 1' ? lobby.team1 : lobby.team2;

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('انتهت اللعبة!')
        .setDescription(`${winningTeam} يفوز!\nتهانينا للفائزين: ${winningPlayers.map(id => `<@${id}>`).join(', ')}!`)
        .addFields(
            { name: 'النقاط لفريق 1', value: gameState.scores.team1.toString(), inline: true },
            { name: 'النقاط لفريق 2', value: gameState.scores.team2.toString(), inline: true }
        )

    await channel.send({ embeds: [embed] });
}

async function offerRestartOrRemove(interaction, lobby, client, originalTeam1, originalTeam2) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('restart_game')
                .setLabel('إعادة تشغيل اللعبة')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('remove_channel')
                .setLabel('مسح الغرفة')
                .setStyle(ButtonStyle.Danger)
        );

    const message = await interaction.channel.send({
        content: 'عايز تلعب تاني؟',
        components: [row]
    });

    const filter = i => (i.customId === 'restart_game' || i.customId === 'remove_channel') && i.user.id === lobby.owner;
    const collector = message.createMessageComponentCollector({ filter, time: 120000 });

    collector.on('collect', async i => {
        if (i.customId === 'restart_game') {
            // Restore the original teams
            lobby.team1 = [...originalTeam1];
            lobby.team2 = [...originalTeam2];

            await i.update({ content: 'جاري إعادة تشغيل اللعبة...', components: [] });
            await startGame(interaction, lobby, client); // Restart the game
        } else if (i.customId === 'remove_channel') {
            await i.update({ content: 'جاري إزالة القناة...', components: [] });
            await stopTheGame(interaction.channel, lobby.owner,client); // Stop the Discord channel and remove the lobby from the client's lobbies map
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            if(!message )return ;
            message.edit({ content: 'انتهى الوقت، لم يتم اختيار أي خيار.', components: [] });
        }
    });
}


async function createUserArray(ids,client) {
    const userArray = [];

    for (const id of ids) {
        try {
        // Fetch the user by ID
            const user = await client.users.fetch(id);
            // Push an object with the user's name and ID to the array
            userArray.push({ name: user.username, playerId: user.id });
        } catch (error) {
            console.error(`Could not fetch user with ID ${id}:`, error);
        }
    }

    return userArray;
}

async function stopTheGame(channel, lobbyOwnerId,client) {
    const lobbyId = channel.id;
    delete client.lobbies[lobbyOwnerId];
    await channel.delete();
}

module.exports = {
    startGame,
    stopTheGame,
};