const mongoose = require("mongoose");
const { Schema } = mongoose;

const guildSchema = new mongoose.Schema({
    guildID: {
        type: String,
        required: true,
        index:true,
    },
    globalMessagePrefix: {
        type: String,
        required: true,
        default: "-",
    },
    customPermissions: {
        develop: {
            type: [String],
            default: [],
        },
        startGame: {
            type: [String],
            default: [],
        },
    },
    commands: {
        showPoints: {
            keywords: {
                type: [String],
                default: ["showPoints"],
            },
            channelsAllowed: {
                type: [String],
                default: [],
            },
            deleteMemberMessage: {
                type: Boolean,
                default: false,
            },
            deleteBotMessage: {
                type: Boolean,
                default: false,
            },
            blacklistChannels: {
                type: [String],
                default: [],
            },
            isDisabled: {
                type: Boolean,
                default: false,
            },
        },
        addPoints: {
            keywords: {
                type: [String],
                default: ["addPoints"],
            },
            rolesAllowed: {
                type: [String],
                default: [],
            },
            channelsAllowed: {
                type: [String],
                default: [],
            },
            deleteMemberMessage: {
                type: Boolean,
                default: false,
            },
            deleteBotMessage: {
                type: Boolean,
                default: false,
            },
            blacklistChannels: {
                type: [String],
                default: [],
            },
            isDisabled: {
                type: Boolean,
                default: false,
            },
        },
        clearPoints: {
            keywords: {
                type: [String],
                default: ["clearPoints"],
            },
            rolesAllowed: {
                type: [String],
                default: [],
            },
            channelsAllowed: {
                type: [String],
                default: [],
            },
            deleteMemberMessage: {
                type: Boolean,
                default: false,
            },
            deleteBotMessage: {
                type: Boolean,
                default: false,
            },
            blacklistChannels: {
                type: [String],
                default: [],
            },
            isDisabled: {
                type: Boolean,
                default: false,
            },
        },
        setPoints: {
            keywords: {
                type: [String],
                default: ["setPoints"],
            },
            rolesAllowed: {
                type: [String],
                default: [],
            },
            channelsAllowed: {
                type: [String],
                default: [],
            },
            deleteMemberMessage: {
                type: Boolean,
                default: false,
            },
            deleteBotMessage: {
                type: Boolean,
                default: false,
            },
            blacklistChannels: {
                type: [String],
                default: [],
            },
            isDisabled: {
                type: Boolean,
                default: false,
            },
        },
    },
    games: {
        teamFights: {
            points: {
                type: Number,
                default: 1,
            },
            channelId: {
                type: String,
                default:"tst",
                required:true,
            },
            startCommand: {
                type: [String],
                default: ["teamfight"],
            },
            maximumCategoriesCount: {
                type: Number,
                default: 5,
            },
            isDisabled: {
                type: Boolean,
                default: false,
            },
            stopGameCommand: {
                type: String,
                default: "stop",
            },
            categoryId: {
                type: String,
                default:"tst",
                required:true,
                
            },
        },
        connectWires: {
            startCommand: {
                type: [String],
                default: ["connectWires"],
            },
            points: {
                type: Number,
                default: 3,
            },
            channels: {
                type: [String],
                default: [],
            },
            gameDuration: {
                type: Number,
                default: 20,
            },
            isMonitoringAllowed: {
                type: Boolean,
                default: true,
            },
            isDisabled: {
                type: Boolean,
                default: false,
            },
        },
        glassBridge: {
            startCommand: {
                type: [String],
                default: ["glassbridge"],
            },
            points: {
                type: Number,
                default: 10,
            },
            gameDuration: {
                type: Number,
                default: 60*5,
            },
            lobbyDuration: {
                type: Number,
                default: 30,
            },
            channels: {
                type: [String],
                default: [],
            },
            isDisabled: {
                type: Boolean,
                default: false,
            },
            playerAttempts: {
                type: Number,
                default: 3,
            },
        },
        guessingGame: {
            startCommand: {
                type: [String],
                default: ["guessinggame"],
            },
            channels: {
                type: [String],
                default: [],
            },
            guessingRange: {
                type: String,
                default: "1-35",
            },
            gameDuration: {
                type: Number,
                default: 60,
            },
            pointsPerEachTry: {
                type: Map,
                of: Number, // Allows only numeric values for new fields
                default: new Map([
                  [1, 5],
                  [2, 4],
                  [3, 3],
                  [4, 2],
                  [5, 2],
                  ['defaultPoints', 1],
                ]),
            },
            isDisabled: {
                type: Boolean,
                default: false,
            },
        },
        patternGame: {
            startCommand: {
                type: [String],
                default: ["pattern"],
            },
            points: {
                type: Number,
                default: 20,
            },
            channels: {
                type: [String],
                default: [],
            },
            gameDuration: {
                type: Number,
                default: 90,
            },
            MIN_DIFFICULTY: {
                type: Number,
                default: 1,
            },
            MAX_DIFFICULTY: {
                type: Number,
                default: 10,
            },
            DEFAULT_DIFFICULTY: {
                type: Number,
                default: 5,
            },
            isDisabled: {
                type: Boolean,
                default: false,
            },
        },
        boxesGame: {
            startCommand: {
                type: [String],
                default: ["boxes"],
            },
            pointsPerDefaultBox: {
                type: Number,
                default: 3,
            },
            pointsPerGreatBox: {
                type: Number,
                default: 30,
            },
            channels: {
                type: [String],
                default: [],
            },
            gameDuration: {
                type: Number,
                default: 120,
            },
            gridSize: {
                type: Number,
                default: 5,
            },
            greatPrizePossibility: {
                type: Number,
                default: 0.1,
            },
            isDisabled: {
                type: Boolean,
                default: false,
            },
        },
        amoungUs:{
            imposterUtilites: {
                type: Map, // A flexible object structure
                of: Boolean,
                default: {
                    electric:false,
                    oxygen:true
                }, // Default empty object
            },
            channels: {
                type: [String], // Array of strings
                default: [], // Default empty array
            },
            startCommand: {
                type: String,
                default: "start", // Default string value
            },
            lobbyDuration: {
                type: Number,
                default: 60, // Default duration in seconds (or any value you prefer)
            },
            points: {
                type: Number,
                default: 0, // Default points value
            },
            isDisabled: {
                type: Boolean,
                default: false, // Default is enabled
            },
            placesAndTasks: {
                type: Map, // Map structure with place names as keys and task counts as values
                of: Number, // Values are numbers
                default: new Map([
                    ["Cafeteria", 5],
                    ["Admin", 3],
                    ["MedBay", 4],
                    ["Electrical", 6],
                ]), // Default values for places and tasks
            },
            maximumPlayers: {
                type: Number,
                default: 10, // Default maximum players
            },
            startMessage: {
                type: String,
                default: "Game is starting!", // Default message
            },
            oxygenPercentage: {
                type: Number,
                default: 100, // Default oxygen percentage
            },
            imposterPerEachPlayers: {
                type: Number,
                default: 1, // Default imposters per player count
            },
            
        }
    },
});

module.exports = mongoose.model("Guild", guildSchema);
