const mongoose = require("mongoose");

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
                1: {
                    type: Number,
                    default: 5,
                },
                2: {
                    type: Number,
                    default: 4,
                },
                3: {
                    type: Number,
                    default: 3,
                },
                4: {
                    type: Number,
                    default: 2,
                },
                5: {
                    type: Number,
                    default: 2,
                },
                defaultPoints: {
                    type: Number,
                    default: 1,
                },            
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
    },
});

module.exports = mongoose.model("Guild", guildSchema);
