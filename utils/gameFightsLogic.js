const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const theQuestions = require('../public/data/questions.json');
const { Sleep } = require('./createDelay');
const { createImage } = require('./createImage');
const {LeaderSettings} = require("../components/LeaderSettings");
const {LobbyComponent} = require("../components/LobbyEmbed")



const {
    getPlayerPoints,
    resetAllPlayersPoints,
    resetPlayerPoints,
    getTopPlayers,
    upsertPlayerPoints,
    addPlayerPoints
} = require("../db/playersScore");


const questions = theQuestions;
const questionsMemo = new Map();

async function startGame(interaction, lobby, client) {
    if(client.lobbies[lobby.owner].isStarted)return;
    await interaction.channel.send("بدء اللعبة!");
    client.lobbies[lobby.owner].isStarted = true;
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
    // await giveMessageAccess(interaction.channel, [...lobby.team1, ...lobby.team2]);

    while (!gameState.gameEnded) {
        const [team1Player, team2Player] = selectRandomPlayers(lobby, gameState.blacklist);

        if (!team1Player || !team2Player) {
            gameState.blacklist.clear(); // Reset blacklist if all players have played
            continue;
        }
        interaction.channel.send(`السؤال التالي بعد 2 ثواني .. <@${team1Player}> - <@${team2Player}>`)
        await Sleep(2000)

        const isQuestionSent = await askQuestion(lobby,interaction.channel, gameState, team1Player, team2Player);
        if(!isQuestionSent) return;
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
        }else{
            if(gameState.roundsThreshold == 5){
                
                await interaction.channel.send("لم يتم الاجإبة ل 5 ادوار متتالية , سيتم ايقاف اللعبة");
                gameState.gameEnded = true;
            }
        }

        if (gameState.scores.team1 >= lobby.winningPoints || gameState.scores.team2 >= lobby.winningPoints) {
            gameState.gameEnded = true;
        }
        
    }

    await announceWinner(interaction.channel, gameState, lobby,originalTeam1,originalTeam2);
    client.lobbies[lobby.owner].isStarted = false;
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

async function askQuestion(lobby, channel, gameState, team1Player, team2Player) {
    if(!lobby) return false;
    const randomCategory = lobby.categories[Math.floor(Math.random() * lobby.categories.length)];
    
    const categoryQuestions = theQuestions[randomCategory];
    const categoryLength = Object.keys(categoryQuestions).length;
    
    const randomQuestionKey = Object.keys(categoryQuestions)[Math.floor(Math.random() * categoryLength)];
    const randomQuestion = categoryQuestions[randomQuestionKey];
    
    const correctAnswer = randomQuestion.answer[0]; // Assuming the first answer is correct
    const allAnswers = [correctAnswer];

    // Generate 4 more unique wrong answers from other questions in the same category
    while (allAnswers.length < 5) {
        const wrongQuestionKey = Object.keys(categoryQuestions)[Math.floor(Math.random() * categoryLength)];
        if (wrongQuestionKey !== randomQuestionKey && correctAnswer != categoryQuestions[wrongQuestionKey].answer[0]) {
            const wrongAnswer = categoryQuestions[wrongQuestionKey].answer[0];
            if (!allAnswers.includes(wrongAnswer)) {
                allAnswers.push(wrongAnswer);
            }
        }
    }

    // Shuffle the answers
    const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);

    const buttons = shuffledAnswers.map((answer, index) => 
        new ButtonBuilder()
            .setCustomId(`answer_${index}`)
            .setLabel(answer)
            .setStyle(ButtonStyle.Primary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    const attachment = await createImage(randomQuestion.question);
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('سؤال المسابقة')
        .setImage('attachment://image.png')
        .addFields(
            { name: 'النقاط لفريق 1', value: gameState.scores.team1.toString(), inline: true },
            { name: 'النقاط لفريق 2', value: gameState.scores.team2.toString(), inline: true }
        )
        .setFooter({ text: 'اختر الإجابة الصحيحة!' });

    await Sleep(3000);
    
    try {
        await channel.send({ 
            content: `<@${team1Player}> <@${team2Player}>, إليكم السؤال:`,
            embeds: [embed],
            components: [row],
            files: [attachment]
        });
        gameState.currentQuestion = {
            ...randomQuestion,
            options: shuffledAnswers,
            correctIndex: shuffledAnswers.indexOf(correctAnswer)
        };
        return true;
    } catch(err) {
        console.error("Error sending question:", err);
        return false;
    }
}

async function waitForAnswer(channel, gameState, team1Player, team2Player) {
    if(!channel) return null;
    return new Promise((resolve) => {
        const filter = i => 
            (i.user.id === team1Player || i.user.id === team2Player) && 
            i.customId.startsWith('answer_');

        const collector = channel.createMessageComponentCollector({ filter, time: 23000 });
        let answeredPlayers = new Set();

        collector.on('collect', async (interaction) => {
            if (answeredPlayers.has(interaction.user.id)) {
                await interaction.reply({ content: 'لقد أجبت بالفعل على هذا السؤال.', ephemeral: true });
                return;
            }

            answeredPlayers.add(interaction.user.id);
            const selectedIndex = parseInt(interaction.customId.split('_')[1]);
            if (selectedIndex === gameState.currentQuestion.correctIndex) {
                collector.stop('correct');
                const winningTeam = interaction.user.id === team1Player ? 'team1' : 'team2';
                const newPoints = await addPlayerPoints(interaction.user.id,1);
                const pointsButton = new ButtonBuilder()
                    .setCustomId('points')
                    .setLabel(`النقاط : ${newPoints}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("💎")
                    .setDisabled(true);
                
                const row = new ActionRowBuilder().addComponents(pointsButton);
                await interaction.reply({
                    content:`إجابة صحيحة! <@${interaction.user.id}> يسجل نقطة لفريق ${winningTeam === 'team1' ? 'فريق 1' : 'فريق 2'}!`,
                    components:[row]
                });
                gameState.roundsThreshold = 0;
                resolve(interaction.user.id);
            } else {
                await interaction.reply({ content: 'إجابة خاطئة!', ephemeral: true });
                gameState.roundsThreshold = 0;
                if (answeredPlayers.size === 2) {
                    collector.stop('both_wrong');
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            if(!channel) return;
            const correctAnswer = gameState.currentQuestion.options[gameState.currentQuestion.correctIndex];
            if (reason === 'time' || reason === 'both_wrong') {
                await channel.send(`انتهى الوقت! الإجابة الصحيحة هي: ${correctAnswer}`);
                gameState.roundsThreshold++;
                resolve(null);
            } else if (reason === 'correct') {
                await channel.send(`الإجابة الصحيحة هي: ${correctAnswer}`);
            }
        });
    });
}

function checkAnswer(userAnswer, correctAnswer) {
    return correctAnswer.some(answer => userAnswer.toLowerCase().trim() === answer.toLowerCase().trim());
}

async function offerKick(channel, winner, oppositeTeam, gameState, lobby, interaction, client) {
    if (!channel || !lobby) return;
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

    const votingPlayers = winningTeam.map(id => `<@${id}>`).join(', ');

    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('فرصة للإقصاء!')
        .setDescription(`${votingPlayers}\nلديكم فرصة للتصويت على إقصاء لاعب من الفريق المنافس. اختاروا لاعبًا للإقصاء:`)
        .setFooter({ text: 'لديكم 10 ثوانٍ للتصويت' });

    const votes = {};
    playerNames.forEach(player => {
        votes[player.playerId] = 0;
    });

    const createButtons = () => {
        let rows = [];
        let row = new ActionRowBuilder(); // Initialize the first row
    
        playerNames.forEach((player, index) => {
            // Add a button for each player
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`kick_${player.playerId}`)
                    .setEmoji(client.NumbersEmo[votes[player.playerId] || 0])
                    .setLabel(`إقصاء ${player.name} `)
                    .setStyle(ButtonStyle.Secondary)
            );
    
            // Push the row after 5 buttons or when it's the last button
            if ((index + 1) % 5 === 0 || index === playerNames.length - 1) {
                rows.push(row); // Push the row to rows array
    
                // Only create a new row if there are more players to process
                if (index + 1 < playerNames.length) {
                    row = new ActionRowBuilder(); // Create a new row for the next set of buttons
                }
            }
        });
    
        return rows;
    };
    
    // Send the message with buttons
    let kickMessage = await channel.send({ embeds: [embed], components: createButtons() });
    

    const filter = i => winningTeam.includes(i.user.id) && i.customId.startsWith('kick_');
    const collector = kickMessage.createMessageComponentCollector({ filter, time: 15000 });
    return new Promise((resolve) => {
        collector.on('collect', async i => {
            const votedPlayer = i.customId.split('_')[1];
            votes[votedPlayer]++;
            
            await i.update({ components: createButtons() });
            await i.followUp({ content: `تم التصويت على إقصاء <@${votedPlayer}>`, ephemeral: true });

            if (votes[votedPlayer] === winningTeam.length) {
                collector.stop('unanimous');
            }
        });

        collector.on('end', async (collected, reason) => {
            if(!kickMessage || !lobby) return;
            await kickMessage.edit({ components: [] });
            if (reason === 'unanimous') {
                const kickedPlayer = Object.keys(votes).find(player => votes[player] === winningTeam.length);
                if (kickedPlayer) await kickPlayer(kickedPlayer, oppositeTeam, lobby, channel);
            } else {
                const maxVotes = Math.max(...Object.values(votes));
                const kickedPlayers = Object.keys(votes).filter(player => votes[player] === maxVotes);

                if (kickedPlayers.length === 1) {
                    await kickPlayer(kickedPlayers[0], oppositeTeam, lobby, channel);
                } else {
                    await channel.send("لم يتم إقصاء أي لاعب بسبب تعادل الأصوات.");
                }
            }

            resolve();
        });
    });
}

async function kickPlayer(playerId, oppositeTeam, lobby, channel) {
    if(!lobby) return;
    const teamToUpdate = oppositeTeam === lobby.team1 ? 'team1' : 'team2';
    lobby[teamToUpdate] = lobby[teamToUpdate].filter(p => p !== playerId);
    await channel.send(`<@${playerId}> تم إقصاؤه من اللعبة!`);
    // removeMessageAcess(channel,playerId)
}

async function announceWinner(channel, gameState, lobby,originalTeam1,originalTeam2) {
    const winningTeam = gameState.scores.team1 > gameState.scores.team2 ? 'فريق 1' : 'فريق 2';
    const winningPlayers = winningTeam === 'فريق 1' ? originalTeam1 : originalTeam2;

    const winnersList = winningPlayers.map(id => `<@${id}>`).join(', ');

    await channel.send(`الفائزون: ${winnersList}`);

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('انتهت اللعبة!')
        .setDescription(`${winningTeam} يفوز!`)
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
                .setCustomId('edit_settings')
                .setLabel('تعديل الإعدادات')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('remove_channel')
                .setLabel('مسح الغرفة')
                .setStyle(ButtonStyle.Danger)
        );

    const message = await interaction.channel.send({
        content: 'ماذا تريد أن تفعل الآن؟',
        components: [row]
    });

    const filter = i => ['restart_game', 'edit_settings', 'remove_channel'].includes(i.customId) && i.user.id === lobby.owner;

    const collector = message.createMessageComponentCollector({ filter, time: 120000 });
    collector.on('collect', async i => {
        if (i.customId === 'restart_game') {
            // Restore the original teams
            lobby.team1 = [...originalTeam1];
            lobby.team2 = [...originalTeam2];

            await i.update({ content: 'جاري إعادة تشغيل اللعبة...', components: [] });
            await startGame(interaction, lobby, client); // Restart the game
        } else if (i.customId === 'edit_settings') {
            lobby.step = 'players';
            const { embed, components } = LeaderSettings(lobby, lobby.owner);
            await i.update({ embeds: [embed], components });
        } else if (i.customId === 'remove_channel') {
            await i.update({ content: 'جاري إزالة القناة...', components: [] });
            await stopTheGame(interaction.channel, lobby.owner, client);
        }
    });

    collector.on('end', async collected => {
        if (collected.size === 0) {
            if (!message) return;
            await message.edit({ content: 'لم يتم اختيار اي اختيار سيتم حذف الغرفة بشكل تلقائي', components: [] });
            try {
                stopTheGame(interaction.channel, lobby.owner, client);
            } catch (err) {
                console.error(`Error stopping the game:`, err);
            }
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
            userArray.push({ name: user.displayName, playerId: user.id });
        } catch (error) {
            console.error(`Could not fetch user with ID ${id}:`, error);
        }
    }

    return userArray;
}



async function stopTheGame(channel, lobbyOwnerId,client,lobby) {
    const lobbyId = channel.id;
    delete client.lobbies[lobbyOwnerId];
    await channel.delete();
}

module.exports = {
    startGame,
    stopTheGame,
    giveMessageAccess,
    removeMessageAcess,
};