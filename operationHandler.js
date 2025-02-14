import fs from 'fs';
import './george.js';
import { George } from './george.js';
import { getRandomElement } from './helpers.js';
import { 
    tech,
    gatherCost,
    tradeCost,
    shoutCost,
    speakCost,
    craftCost,
    attackCost, 
    forestTerrain,
    grassTerrain,
    oceanTerrain,
    mountainTerrain,
    minGather,
    maxGather,
    plannedPosIcon,
    desertTerrain,
    seizureCost,
    seizureDepreciation,
    bidCost} from './henry.js';
import { 
    logDEBUG, 
    readCurrentInboxMail, 
    messageAllPlayersImmediately, 
    addToCurrentInbox, 
    readAllInboxes, 
    currentInboxSpokenTo,
    speakToCurrentInbox,
    messagePlayerImmediatelyByPlayerName,
    clearCurrentInbox,
    checkAdmin,
    setConsolePlayerName,
    messageCurrentInboxImmediately,
    logWarning
} from './output.js';
import { setLizzieUnavailable, lizzieSummary } from './lizzie.js';
import { testSuite } from './seethezot.js';
import { processDay } from './processor.js';


const operations = new Map();
const filePath = './savedGame.json';

let george                  = new George();
let lastFrame               = Date.now();

function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastFrame;
    lastFrame = currentTime;

    if (george.ongoing && !george.isPaused) {
        george.dayClock += deltaTime;

        if (!george.dawnWarning && george.secondsPerDay * 1000 - george.dayClock < george.warningSeconds * 1000) {
            george.dawnWarning = true;
            messageAllPlayersImmediately(`Notice: ${george.warningSeconds} seconds until the day begins. Make your plans!`);
        }
        
        // Check if a day has passed
        // This will save
        if (george.dayClock >= george.secondsPerDay * 1000) georgeDay();
    }
    else if (george.ended) {
        george = new George();
    }

    // Schedule the next frame
    setTimeout(gameLoop, 1000 / 60); // Aim for 60 FPS
}

logDEBUG("Starting game loop...");

// Start the game loop
gameLoop();

export function setGeorgePlayer(playerName) {
    george.id = george.playerNames.indexOf(playerName);
}

export function setGeorgeBotsRunning(b) {
    george.runningBots = b;
}

// Returns 'true' if game should quit
export function handleGameInput(input) {

    // No input
    if (input.length === 0) return false;
    
    const args  = input.trim().toLowerCase().split(' ').filter(word => word !== '');
    const opArg = args[0]; // First word

    let playingGame = george.id >=0 && george.ongoing;
    let isAdmin = checkAdmin();
    let handled = false;

    // Only owner can shut down the bot
    if (opArg === 'exit') {
        handled = true;

        if (isAdmin) {
            logDEBUG('Exiting...');
            messagePlayerImmediatelyByPlayerName(george.playerNames[george.id], "Exiting, editing availability message...");
            setLizzieUnavailable();
            return true;  // Allowing quitting at any time I guess.
        }
        else addToCurrentInbox("Only the Landlord can turn off the bot.");
    }

    const op = operations.get(opArg);
    const techObject = tech.find(t => t.craftName == opArg);

    if (op) {
        handled = true;
        const debug = op.hasOwnProperty("debug");
        if (debug) {
            if (isAdmin) op.fn(args);
            else addToCurrentInbox(`Only the Landlord can use '${opArg}'.`);
        }
        else {
            const gameMustBeRunning = !op.hasOwnProperty("menu");
            if (gameMustBeRunning && !playingGame) {
                if (op.hasOwnProperty("peek")) op.fn(args);
                else addToCurrentInbox(`Can't use '${opArg}' if you're not in game.`);
            }
            else op.fn(args);
        }
    }
    else if (techObject) {
        handled = true;
        george.itemUse(args);
    }
    else addToCurrentInbox(`Can't parse '${opArg}'. Type 'help' or '?' for partial list of commands.`);

    // If this is first thing said and it didn't make sense, we are more gentle!
    if (currentInboxSpokenTo() < 1) {
        speakToCurrentInbox();
        if (!handled) {
            clearCurrentInbox();
            addToCurrentInbox("Hello. Type '?' or 'help' to see commands.");
        }
    }

    readCurrentInboxMail();
    return false;
}

export function georgeDay() {
    
    if (!george.ongoing) {
        logDEBUG("Can't process day. Game not started.");
        return false; ////////////
    }

    let successfulDay = true;
    try {
        processDay(george);
    }
    catch (err) {
        readAllInboxes();
        logDEBUG(`\n\nERROR IN georgeDay\n\n: ${err.message}\nStack trace:\n${err.stack}\n\n`);
        successfulDay = false;
    }

    if (successfulDay) {
        const gameState = JSON.stringify(george, null, 2);
        fs.writeFile(filePath, gameState, (err) => {
            if (err) {
                logDEBUG(`\n\nERROR IN writeFile (saving the game)\n\n: ${err.message}\nStack trace:\n${err.stack}\n\n`);
            }
        });
    }
    else {
        messageAllPlayersImmediately("There was an error during the last day. Might wanna quit and reload or something. Idk.")
    }
}

function load() {
    messageCurrentInboxImmediately("Attempting to reloaded a game...");
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            logDEBUG('Error reading game state:', err);
            messageCurrentInboxImmediately("There was an error reading the save file.")
            return;
        }
        try {
            
            george = new George();

            const parsedData = JSON.parse(data);
            george = Object.assign(george, parsedData);
            george.allowRejoining = true;
            george.pauseClock();
            for (let i = 0; i < george.playerNames.length; i++) {
                george.deadPlayers.push(true);
            }
            messageCurrentInboxImmediately("Successfully reloaded a game. Use 'players' to see who to 'rejoin' as.");

        } catch (parseErr) {
            logDEBUG('Error parsing game state:', parseErr);
            messageCurrentInboxImmediately("There was an error parsing the JSON.")
        }
    });

    // Hm, seems like there's some weird asychronous stuff happening
    // These printouts happening after the try block maybe?
    // Doesn't matter for my purposes right now.
}

//#region cheating/debug
operations.set("switch", {
    description: "Pretend to be another player!",
    menu: true,
    debugOnly: true,
    fn: function(args) {

        if (args.length < 2) {
            
            setConsolePlayerName('');
            logDEBUG("switched to a new console user with no name!");
        }
        // Need a name to switch to
        else {

            // Go to new console user, if we're a player console user
            if (george.id >= 0) {
                if (george.playerPlans[george.id].length > 10) {
                    logWarning("for " + george.playerNames[george.id] + ", plans: " + george.playerPlans[george.id].length);
                }
            }

            const formattedName = args[1].charAt(0).toUpperCase() + args[1].substring(1);
            const index = george.playerNames.indexOf(formattedName);
            if (index >= 0) {
                setConsolePlayerName(george.playerNames[index]);
                logDEBUG("switched to " + formattedName + "!");
            }
            else logDEBUG("couldn't switch to " + args[1] + ". George id: " + george.id + ".");
        }
    }
});
operations.set("showmethemoney", {
    description: "resoures cheating",
    debugOnly: true,
    fn: (args) => george.debugWealth(args)
});
operations.set("poweroverwhelming", {
    description: "energy cheating",
    debugOnly: true,
    fn: (args) => george.debugEnergy(args)
});
operations.set("forceready", {
    description: "force all ready",
    debugOnly: true,
    fn: (args) => george.ready(args, true)
});
operations.set("thereisnocowlevel", {
    description: "end game",
    debugOnly: true,
    fn: (args) => george.endGame(args)
});
operations.set("kick", {
    description: "kick player",
    debugOnly: true,
    fn: (args) => george.debugKick(args)
});
operations.set("load", {
    description: "load last save",
    debugOnly: true,
    fn: (args) => this.load()
});
operations.set("reveal", {
    description: "reveal map",
    debugOnly: true,
    fn: (args) => george.debugRevealMap(args)
});
operations.set("warp", {
    description: "warp to location",
    debugOnly: true,
    fn: (args) => george.debugWarp(args)
});
operations.set("runtests", {
    description: "",
    peek: true,
    debugOnly: true,
    fn: (args) => testSuite(args)
});
//#endregion


const helpOp = {
    menu: true,
    lore: "No zot is an island.",
    shortDescription: "see commands or info for specific command",
    description: "Can be accessed with '?' or 'help'. Lists commands. Also, a '?' on the map or next to a zot means a trade is available.\n\n"
    
    + `?:           shows important commands\n`
    + `? hidden:    shows less used commands or aliases\n`
    + `? <command>: shows full command description\n`,

    fn: function(args) {
        if (args[1] == 'hidden' || args.length < 2) {

            const showHidden = args[1] == 'hidden';
            let strMenu = "";
            let strSpirit = "";
            let strMisc = "";
            let strInv = "";
            let strCom = "";
            let strPlans = "";

            for (const key of operations.keys()) {
                const op = operations.get(key);
                if (op.hasOwnProperty("debugOnly")) continue;
                const isHidden = op.hasOwnProperty("hide") && op.hide;
                if (!showHidden && isHidden) continue;
                if (showHidden && !isHidden) continue;

                const description = op.shortDescription;
                if (!op.shortDescription) {
                    logDEBUG("no short description on " + key);
                }
                if (!op.description) {
                    logDEBUG("no description on " + key);
                }
                const commandWidth = 18;
                const descriptionWidth = 18;
                if (operations.get(key).hasOwnProperty("plan")) {
                    strPlans += `${key.toString().padEnd(commandWidth)} ${description.padEnd(descriptionWidth)}\n`;
                }
                else if (operations.get(key).hasOwnProperty("menu")) {
                    strMenu += `${key.toString().padEnd(commandWidth)} ${description.padEnd(descriptionWidth)}\n`;
                }
                else if (operations.get(key).hasOwnProperty("spiritual")) {
                    strSpirit += `${key.toString().padEnd(commandWidth)} ${description.padEnd(descriptionWidth)}\n`;
                }
                else if (operations.get(key).hasOwnProperty("communication")) {
                    strCom += `${key.toString().padEnd(commandWidth)} ${description.padEnd(descriptionWidth)}\n`;
                }
                else if (operations.get(key).hasOwnProperty("inventory")) {
                    strInv += `${key.toString().padEnd(commandWidth)} ${description.padEnd(descriptionWidth)}\n`;
                }
                else {
                    strMisc += `${key.toString().padEnd(commandWidth)} ${description.padEnd(descriptionWidth)}\n`;
                }
            }

            if (george.ongoing || showHidden) {
                addToCurrentInbox("");
                addToCurrentInbox("To interact, type commands. For more information on any command, type '? <command>'.");
                if (!showHidden) addToCurrentInbox("To view hidden commands, use '? hidden' or 'help hidden'.");
                else addToCurrentInbox("These are the aliases of commands or hidden commands.");
                addToCurrentInbox("");
                addToCurrentInbox("MENU COMMANDS:");
                addToCurrentInbox(strMenu);
                addToCurrentInbox("SPIRITUAL COMMANDS:");
                addToCurrentInbox(strSpirit);
                addToCurrentInbox("MISCELLANEOUS COMMANDS:");
                addToCurrentInbox(strMisc);
                addToCurrentInbox("INVENTORY COMMANDS:");
                addToCurrentInbox(strInv);
                addToCurrentInbox("PLAN COMMANDS:");
                addToCurrentInbox(strPlans);
                addToCurrentInbox("COMMUNICATION COMMANDS:");
                addToCurrentInbox(strCom);
            }
            else {
                addToCurrentInbox("");
                addToCurrentInbox("To interact, type commands. For more information on any command, type '? <command>'.");
                addToCurrentInbox("The game has not started, so only some commands are shown.");
                addToCurrentInbox("To view hidden commands, use '? hidden' or 'help hidden'.");
                addToCurrentInbox("");
                addToCurrentInbox("MENU COMMANDS:");
                addToCurrentInbox(strMenu);
                addToCurrentInbox("SPIRITUAL COMMANDS:");
                addToCurrentInbox(strSpirit);
            }
        }
        else if (args.length > 1) {
            const opToQuery = operations.get(args[1]);
            if (opToQuery) addToCurrentInbox("\n" + opToQuery.description);
            else {
                const techObj = tech.find(ob => ob.craftName == args[1]);
                if (techObj) {
                    if (george.ongoing) {
                        george.planCraft(['craft', '?', techObj.craftName]);
                    }
                    else {
                        addToCurrentInbox(techObj.description + "\n\n"
                            + `${techObj.tobbles}t ${techObj.nup}n ${techObj.wiggsies}w ${techObj.getacles}g ${techObj.moaf}m`);
                    }
                }
                else if (['t', 'tobbles', 'tobblerone'].includes(args[1])){
                    addToCurrentInbox(`Tobbles are plentiful in the ${forestTerrain} lands. A tobblerone reliably produces a pair tobbles each season. Good for many basic crafts.`);
                }
                else if (['n', 'nup', 'nupfield', 'nupfields'].includes(args[1])){
                    addToCurrentInbox(`Nup are mostly found in the ${grassTerrain} lands. Each nup that survives the season will produce one more nup. A plot can only hold 20 nup per nupfield. Nup fields will always produce at least 1 nup each.`);
                }
                else if (['w', 'wiggsies', 'wigroot', 'wigroot'].includes(args[1])){
                    addToCurrentInbox(`Wiggsies are mostly found in the ${grassTerrain} lands. From 1 to 20 wiggsies will blossom on one wigroot each season. May be crafted into an inject for some easy energy.`);
                }
                else if (['g', 'getacles', 'getnest', 'getnests'].includes(args[1])){
                    addToCurrentInbox(`Getacles are mostly found in the ${oceanTerrain} lands. A getacle nest produces 2 getacles per season.`);
                }
                else if (['m', 'moaf', 'moafpit', 'moafpits'].includes(args[1])){
                    addToCurrentInbox(`Moaf is mostly found in the ${mountainTerrain} lands. Moaf pits produce 2 moaf per season. Moaf is primarily used for advanced crafting.`);
                }
                else if (['zearth','map','world']) {
                    addToCurrentInbox(`Zearth is a flat world. There are 5 terrains: ${desertTerrain}, ${grassTerrain}, ${forestTerrain}, ${oceanTerrain}, and ${mountainTerrain}.`
                    + ` There are 5 resources: tobbles, nup, wiggsies, getacles, and moaf. These are produced by nature every season based on the features of the land: tobblerone, nup fields, wigroot, get nests, and moaf pits.`
                    + ` The zots imagined themselves into being here, a long time ago, or far in the future. They exert themselves, seeking to satisfy their desires..`);
                }
                else addToCurrentInbox(`Unknown operation '${args[1]}'`);
            }
        }
    }
};
operations.set("help", helpOp);
const questionMarkOp = {...helpOp};
questionMarkOp.hide = true;
operations.set("?", questionMarkOp);

operations.set("settings", {
    menu: true,
    lore: "Henry George reaches down from Heaven and adjusts the local laws of physics.",
    shortDescription: "view or change game settings before starting",
    description: "View or change settings of game. Players cannot adjust settings during a game.\n\n"

    + "settings:                    lists all settings\n"
    + "settings daylength <#>:      sets the number of turns in seconds\n"
    + "settings mapsize <#> <#>:    sets the map width x height\n"
    + "settings energyperday <#>:   sets the starting energy regen\n"
    + "settings startingmaxenergy <#>: sets the starting energy cap\n"
    + "settings secret <#>:         TBD\n",
    //+ "settings difficulty <#>: easy = 1, normal = 2, hard = 3\n",
    
    fn: (args) => george.settings(args)
});

operations.set("join", {
    menu: true,
    lore: "A zot, by the will of Heaven, may imagine itself into being.",
    shortDescription: "join game with the player name provided",
    description: "Register with specified name either before starting a game or joining a game in progress. " 
    + "You start with some energy, no resources, no items, no land.\n\n"

    + "join:                shows names of player who have joined\n"
    + "join <player name>:  joins with specified name, if available\n",

    fn: (args) => george.joinGame(args)
});
operations.set("rejoin", {
    menu: true,
    hide: true,
    lore: "A zot, by the will of Heaven, may reimagine itself into being.",
    shortDescription: "rejoin game with the player name provided",
    description: "Specify which player you want to rejoin as.\n\n"

    + "rejoin <player name>: joins with specified name, if reloading\n",

    fn: (args) => george.rejoinGame(args)
});

operations.set("leave", {
    menu: true,
    lore: "A zot may choose to unimagine itself, reuniting with the energy of Zearth.",
    shortDescription: "drop out of game",
    description: "You will leave the game. If there are other players, it will continue. Not sure what happens to your assets and land yet.\n",

    fn: (args) => george.leaveGame(args)
});


operations.set("start", {
    menu: true,
    lore: "A voice from Heaven cries out, \"Go Forth and Labor Upon Mother Zearth!\"",
    shortDescription: "starts first day of game",
    description: "Starts game with current list of players and settings. To reload, use a hidden command, 'reload'.\n\n"

    + "start: starts game\n",

    fn: (args) => george.startGame(args)
});

operations.set("reload", {
    menu: true,
    hide: true,
    peek: true,
    lore: "tbd",
    shortDescription: "reloads last day of last game",
    description: "Reload last day of last game. Join with 'rejoin'.\n\n"

    + "reload: reloads game\n",

    fn: function(args) {
        load();
    }
});

operations.set("lore", {
    menu: true,
    lore: "'See The Zot' was created by Max Clark for George Jam 2024.",
    shortDescription: "learn about zots",
    description: "Learn about the history and culture of zots. Use the 'lore' command on any commands, items, improvements, or land to learn about it and it means to zots.\n\n"
    
    + "lore <command/itemname/resource/plot>: shows lore for specified object\n",
    
    fn: (args) => {
        if (args.length > 1) {
            const op = operations.get(args[1]);
            if (op) addToCurrentInbox(op.lore);
            else {
                const techObj = tech.find(obj => obj.craftName == args[1]);
                if (techObj) addToCurrentInbox(techObj.lore);
                else if (['t', 'tobbles', 'tobblerone'].includes(args[1])){
                    addToCurrentInbox(`Tobbles are sturdy and light. Makes for good toys for zotlings. Zelectrozagnatism allows for rods to attract tobbles right out of the tobblerone with the greatest of ease.`);
                }
                else if (['n', 'nup', 'nupfield', 'nupfields'].includes(args[1])){
                    addToCurrentInbox(`Nup are highly territorial of their fields, but otherwise are happy to chew wiggsies all day.`);
                }
                else if (['w', 'wiggsies', 'wigroot', 'wigroot'].includes(args[1])){
                    addToCurrentInbox(`Wiggsies Colorful plants that everywhere and wonderful.`);
                }
                else if (['g', 'getacles', 'getnest', 'getnests'].includes(args[1])){
                    addToCurrentInbox(`todo`);
                }
                else if (['m', 'moaf', 'moafpit', 'moafpits'].includes(args[1])){
                    addToCurrentInbox(`todo`);
                }
                else if (args[1] == grassTerrain) {
                    addToCurrentInbox(`really special grass or something tbd :)`);
                }
                else if (args[1] == forestTerrain) {
                    addToCurrentInbox(`really special trees or something tbd :)`);
                }
                else if (args[1] == oceanTerrain) {
                    addToCurrentInbox(`really special water or something tbd :)`);
                }
                else if (args[1] == mountainTerrain) {
                    addToCurrentInbox(`really special mountains or something tbd :)`);
                }
                else if (args[1] == desertTerrain) {
                    addToCurrentInbox(`really boring desert or something tbd :)`);
                }
                else addToCurrentInbox(`Unknown operation '${args[1]}'`);
            }
        }
        else {
            // Print game lore
            addToCurrentInbox("\n\nYou are a zot."
                            + "\nReady to labor with a strong arm and a full lung."
                            + "\nWith biological television, you can seek to satisfy your desires with the least exertion.\n"
                            );
        }
    }
});

/////////////////////

operations.set("lizzie", {
    spiritual: true,
    peek: true,
    lore: "Lizzie is a robot written in Javascript. Lizzie was named after Lizzie Magie, the designer of the Landlord's Game, which you know as Monopoly. Like her namesake, Lizzie is an abolitionist, Georgist, and feminist.",
    shortDescription: "Lizzie explains",
    description: `Lizzie explains what "See The Zot" is.`,
    fn: function(args) {
        addToCurrentInbox("\n\n" + lizzieSummary + `\n`);
    },
});

operations.set("purpose", {
    spiritual: true,
    peek: true,
    hide: true,
    lore: "George's fundamental force",
    shortDescription: "what to do",
    description: "What to do with your existence on Zearth.",
    fn: function(args) {
        addToCurrentInbox("Seek to satisfy your desires with the least exertion.\n"
        + `Type 'scoreboard', if need more.\n`)}
});

/////////////////////

operations.set("pause", {
    lore: "George has dominion over nature.",
    shortDescription: "suspend countdown",
    description: "Suspend the game clock and auto processing days. Plans can be made while paused. Lettering game stay paused and all players using 'ready' would allow you to play without a time clock.",
    fn: (args) => george.pause(args)
});

operations.set("resume", {
    lore: "George has dominion over nature.",
    hide: true,
    shortDescription: "resume counting down and processing days",
    description: "Resume the game and processing days. Plans can be made while paused. Lettering game stay paused and all players using 'ready' would allow you to play without a time clock.",
    fn: (args) => george.resume(args)
});

operations.set("time", {
    lore: "Somewhere, there's always a zot checking his watch. So it is televised to you.",
    hide: true,
    shortDescription: "show countdown until next day",
    description: "Shows how many seconds until the day starts, what day it is, and when the season ends.\n",

    fn: (args) => george.checkTime(args)
});
const clockOp = {...operations.get("time")};
operations.set("clock", clockOp);

operations.set("players", {
    peek: true,
    lore: "All known zots on this planet.",
    shortDescription: "lists players in the game",
    description: "Lists players in the game and location." 
    + "If game reloaded, may list players available for rejoin.\n",

    fn: (args) => george.playersCommand()
});
const zotsOp = {...operations.get("zots")};
zotsOp.hide = true;
operations.set("zots", zotsOp);

operations.set("i", {
    peek: true,
    lore: "Sometimes, a zot takes at look in the mirror and it isn't pretty.",

    shortDescription: "shows resources, items, and plots",
    description: "Shows your resources, items, and plots."
    + ` You can reorder the list of items, which is helpful for certain game behaviors that will use the first item found in the list.`
    + ` Some items can be used, like injects and droplets.\n\n`

    + "i:               shows resources, items, and plots\n"
    + "i <#a> <#b>:     moves item at position a to position b in list\n"
    + "<itemname> use:  uses item, if applicable\n",

    fn: (args) => george.status(args)
});
const iOp = {...operations.get("i")};
iOp.hide = true;
operations.set("me", iOp);
operations.set("inventory", iOp);
operations.set("inv", iOp);


// operations.set("i", {
//     peek: true,
//     lore: "\n\nYou are a zot."
//         + "\nReady to labor with a strong arm and a full lung."
//         + "\nWith the help of television, you can produce much for the zoot.\n",

//     shortDescription: "shows status, resources, items, and land improvements",
//     description: "Can also be accessed with 'me'. Shows your position, planned position, energy, max energy, land, resources, and items.\n"
//     + ` A shortcut to use items is '<itemname>', which will use the first item in your list with that name.`
//     + ` You can reorder the list of items.\n\n`

//     + "i <item#> <item#>: reorders items, this affects which item '<itemname>' will select\n"
//     + "i use <item#>: use specific item\n",

//     fn: (args) => george.status(args)
// });
// const iOp = {...operations.get("i")};
// iOp.hide = true;
// operations.set("me", iOp);
// const invOp = {...operations.get("i")};
// invOp.inventory = true;
// invOp.hide = true;
// invOp.description += `(same as 'i' and 'me')`;
// operations.set("inventory", invOp);

// operations.set("map", {
//     lore: "A record of all the locations seen by all zotkind.",
//     hide: true,
//     shortDescription: "show world map",
//     description: `View the map, your plot location as '@', other zots as 'z', your planned location as '${plannedPosIcon}', and any discovered terrain.\n`
    
//                 + `\n${grassTerrain} lots of nup and wiggsies`
//                 + `\n${forestTerrain} lots of tobbles`
//                 + `\n${oceanTerrain} lots of getacles`
//                 + `\n${mountainTerrain} some moaf`
//                 + `\n${desertTerrain} not much of anything`,

//     fn: (args) => george.showMap(args)
// });

operations.set("look", {
    hide: false,
    lore: "Using television, you can see what any other zot has seen before.",
    shortDescription: "show plot info",
    description: "View a plot on the map and see its terrain type, what resources are there, who owns it, and if any land improvements exist. Use 'map' to figure out what plots to look at.\n\n"

    + "look:                        shows info for plot currently on\n"
    + "look <letter+#>:             shows info for any plot (e.g. 'look a3')\n"
    + "look <ul/u/ur/r/dr/d/dl/l>:  shows info for plot in given direction\n"
    + "look <nw/n/ne/e/se/s/sw/e>:  shows info for plot in given direction\n",

    fn: (args) => george.look(args)
});
const lkOp = {...operations.get("look")};
lkOp.hide = true;
operations.set("lk", lkOp);
operations.set("plans", lkOp);
operations.set("map", lkOp);


// operations.set("plans", {
//     lore: "When a zot is exposed to sunlight, they enter into a fugue state, no longer able to think or reason, being purely dominated by a preternatural executive function to perform whatever is on their day planner.",
//     shortDescription: "view plans for the day",
//     description: "View order of plans, details, and cost. To cancel a plan, use 'cancel'."
//     + " If you are done with your plans, you can use 'ready' to process days faster, if all zots ready up.\n\n"

//     + "plans: lists current plans\n",

//     fn: (args) => george.plans(args)
// });

operations.set("land", {
    lore: "The tax collector is one of the highest-regarded zots on the face of Zearth.",
    shortDescription: "view plots, pay LVT",
    description: 
        "View your plots, improvements, and your Land Value Tax (LVT). Your LVT is due at the end of every season.\n\n"

        + ` Taxes can be paid using any resource. If your LVT is 10, you can pay with 10 wiggsies or with 5 tobbles + 5 nup.`
        + " Your dues will be taken instantly and randomly out of the resources you're holding or have stashed in plosets anywhere."
        + ` If you wish to specify which resources to be taken, you can make deposits by typing 'land <#resources>'.\n\n`

        + ` Note: you CANNOT get deposited resources back and`
        + ` all deposits are taken every season. Overpayments will be considered donations.`
        + ` Everyone's LVTs are redistributed equally to all zots, as a Citizen's Dividend.\n\n`
        
        + ` If you can't pay your LVT for a plot, you lose ownership and incur a debt equal to the LVT remaining for that plot x2.`
        + ` You can use this 'land <plot> <#>' to rearrange the order of your plot payments, if you're afraid of defaulting. Consider initiating an auction on a plot with a bid of 0 to lower your LVT.`
        + ` Alternatively, you can 'abandon' a plot you own for 0e that will take effect with the next season. Your current LVT is still due.\n\n`

    + "land:               shows land, improvements, LVT info\n"
    + "land <#resource>:   deposit # of resources for next LVT\n"
    + "land <plot> <#>:    reorders plot to position specified\n",

    fn: (args) => george.lands(args)
});
const landsOp = {...operations.get("land")};
landsOp.hide = true;
operations.set("lands", landsOp);
operations.set("lvt", landsOp);

operations.set("cancel", {
    lore: "Sometimes, zots change their minds.",
    shortDescription: "cancel plan(s)",
    description: "Cancels the last plan or all plans.\n\n"

    + "cancel:      cancels last plan\n"
    + "cancel all:  cancels all plans\n",
    
    fn: (args) => george.cancelPlans(args)
});

operations.set("ready", {
    lore: "#TODO",
    shortDescription: "indicate ready, if all players ready, day begins",
    description: "Indicate you are ready for the day. You cannot undo this. You can try to change your plans, but your messages might arrive late and be ignored.\n\n"

    + "ready: indicates you are ready\n",

    fn: (args) => george.ready(args)
});

/////// ASSET COMMANDS ///////
operations.set("stash", {
    lore: "#TODO",
    inventory: true,
    shortDescription: "store resources or items in closets",
    description: "You must be on owned land with a ploset to store resources or with an entroset to store items. If one closet is full, it will automatically try to fill the next one."
    + " When a closet crumbles due to entropy, it will transfer its good to another closet of same kind or the goods are dumped.\n\n"

    + `stash <#-letter>: moves # of resources from inventory into ploset\n`
    + `stash <itemname>: moves first matching item from inventory into entroset\n`,

    fn: (args) => george.stash(args)
});

operations.set("take", {
    lore: "TODO",
    inventory: true,
    shortDescription: "take resources or items from closets",
    description: "You must be on owned land with a ploset to take resources or with an entroset to take items. This will search through all closets for goods designated.\n\n"

    + `take <#-letter>: moves # of resources from ploset into inventory\n`
    + `take <itemname>: moves first matching item from entroset into inventory\n`,

    fn: (args) => george.take(args)
});
operations.set("drop", {
    lore: "Zots, as a rule, are not given to hoarding.",
    inventory: true,
    shortDescription: "removes goods, makes space",
    description: "Removes resources or items in your inventory. This can be helpful if you're overburdend and wanting to move. Items are destroyed."
                + " Resources are dumped onto the land.\n\n"

    + `drop <#-letter>: removes # of resource in your inventory\n`
    + `drop <itemname>: removes first item matching <itemname> in your inventory\n`,

    fn: (args) => george.dump(args)
});
operations.set("use", {
    lore: "Use it or stash it, a zot always says.",
    inventory: true,
    shortDescription: "uses item",
    description: "Some items have a use, which consumed the item, such as injects and droplets. This command will use the first in your item list. To rearrange item order, use 'i'.\n\n"

    + `use <itemname>: uses first item matching <itemname>, if it has a use\n`,

    fn: (args) => george.useItem(args)
});

operations.set("abandon", {
    lore: "#TODO",
    inventory: true,
    shortDescription: "gives up ownership of a plot",
    description: "Scheduling to relinquish plot ownership at season's end. Alternatively, you may consider bidding 0 as a way of lowering your LVT. Any bio fencing will be destroyed upon loss of ownership."

    + `abandon <#-letter>: gives up ownership at plot\n`,

    fn: (args) => george.abandon(args)
});


/////// PLANS ///////////////////////
/////// PLANS ///////////////////////
/////// PLANS ///////////////////////
/////// PLANS ///////////////////////

operations.set("move", {
    plan: true,
    hide: false,
    lore: "To go for a trot to a neighboring plot is fun for a zot, but can cost a lot.",
    shortDescription: `move one space up, down, left, right (variable e cost)`,
    description: 
    `Moves player 1 space for an energy cost that is determined by the terrain.` 
    + ` If moving into an unexplored plot, it will reveal that terrain.`
    + ` You must be holding fewer resources than your carrying capacity to move.\n\n`

    + "move <ul/u/ur/r/dr/d/dl/l>: plan an 8-directional move 1 space (?e)\n"
    + "move <nw/n/ne/e/se/s/sw/e>: plan an 8-directional move 1 space (?e)\n",

    fn: (args) => george.planMove(args)
});
const mOp = {...operations.get("move")};
mOp.hide = true;
operations.set("m", mOp);

operations.set("gather", {
    plan: true,
    hide: false,
    lore: "As long as a zot is fairly compensating the zoot for any land they use in exclusivity, they are free to gather at will.",
    shortDescription: `gain ${minGather} to ${maxGather} resources from land (${gatherCost}e)`,
    description: 
    `Gather  ${minGather} to ${maxGather} resources amount of resource specified, if present.`
    + ` Tools can increase the amount gathered.`
    + ` If you execute a 'move' prior to this in your plans, this command will try to take resources from the plot you ended up on.`

    + `gather <resource name>: plan to gather resources (${gatherCost}e)\n`,

    fn: (args) => george.planGather(args)
});
const gOp = {...operations.get("gather")};
gOp.hide = true;
operations.set("g", gOp);

operations.set("craft", {
    plan: true,
    peek: true,
    shortDescription: `make items or build improvements with resources (${craftCost}e)`,
    lore: "The produce of the labor is the just reward of the labor of the zot. No other zot shall can claim any piece of it.",
    description: 
    "Creates the specificed object, if you have the resources and energy."
    + ` Objects that are land improvements will be affixed to the land crated upon.\n\n`
    + ` If build on others land, may be subject to seizure.\n\n`

    + `craft:               lists all crafts available\n`
    + `craft <craft name>:  plan to craft for (${craftCost}e)\n`
    + "<craft name>:        shows info and requirements to craft\n"
    + "<craft name> use:    uses crafted item, if possible\n",

    fn: (args) => george.planCraft(args)
});


operations.set("bid", {
    communication: true,
    lore: 'Every zotling must spend a season staring at the auction board, so that all zots may look through their eyes what plots are up for auction at anytime.',
    shortDescription: `start auction or bid (${bidCost}e)`,
    description: 
    `Bid the amount of LVT you would pay for ownership.`
    + ` Ownership grants the ability to 'seize' or craft 'biofence'.`
    + ` If you win, the LVT is set at the 2nd highest bid. That will be due when at season's end and will be ongoing.\n\n`
    + ` You can lose ownership by defaulting on your debt or using 'abandon'. You can also initiate a bid on your land in an effort to lower your LVT.\n\n`

    + `If no auction is ongoing, an auction will be started. `
    + `If the land has an owner, the owner starts with a bid equal to the bid they won with.\n\n`
    
    + `All auctions end when season ends.`
    + ` Auctions must be started by the 2nd to last day of a season.`
    + ` Changing your bid incurs no further energy cost.\n\n`

    + ` To learn about taxes, type '? taxes'\n`
    + ` To learn about auction theory, type 'vickrey'.\n\n`

    + "bid:             shows all auctions\n"
    + `bid <plot> <#>:  new bid costs ${bidCost}e, changing bid is free\n`
    + `(If someone starts an auction on your plot, your last bid is remembered)\n\n`
    
    + `Example: bid a1 5`,

    fn: (args) => george.bid(args)
});
const aucOp = {...operations.get("bid")};
aucOp.hide = true;
operations.set("auctions", aucOp);

operations.set("offer", {
    communication: true,
    lore: '"Two greedy zots a fair trade make." ~ ancient zot saying',
    shortDescription: `post your trade (${tradeCost}e)`,
    description: 
    
    `Immediately expend ${tradeCost}e to offer a trade. If you make another offer, it will remove your old offer.`
    + ` Trades can only be accepted by neighboring zot (within 1 plot). Both parties must have specified resources at time of trade.`
    + ` If the trade is accepted, the offerer will not be charged any more energy.\n\n`
    
    + `\nAn item can only be on the offered side of the trade. It must be the first asset specified.`
    + ` Note that items depreciate, so the hp of an item will update when the offer is viewed.`
    + ` It will be first item in the offerer's inventory. Reorder items with 'i'.\n`

    + `\nAn offer will last until accepted, canceled, or replaced.`
    + `\nCanceling is free.\n\n`

    + `offer:                           shows the list of trades\n`
    + `offer <#-letter> for <#-letter>: specify multiple resources offered or wanted (${tradeCost}e)\n`
    + `offer <itemname> for <#+letter>: specify an item to offer for resources (${tradeCost}e)\n`
    + `offer <itemname> for <#+letter>: specify an item to offer for resources (${tradeCost}e)\n`
    + `offer cancel:                    cancels last offer made\n`
    + `offer cancel <#>:                cancels the offer at # on the list of offers\n\n`

    + ` Example: 'offer 5t for 5w' will offer 5 tobbles for 5 wiggsies.\n`
    + ` Example: 'offer 20g 5m for 100w' will offer 20 getacles and 5 moaf for 100 wiggsies.\n`
    + ` Example: 'offer inject for 10n' will offer the first inject in offerer's inventory for 10 nup.\n`
    + ` Example: 'offer droplet 10w for 100t' will offer an inject and 10 wiggsies for 100 tobbles.\n`
    + ` Example: 'offer a1 rent 5 for 20g' will offer rental rights for 5 days for 20 getacles.`,

    fn: (args) => george.postOffer(george.id, args)
});
const offersOp = {...operations.get("offer")};
offersOp.hide = true;
operations.set("offers", offersOp);
operations.set("trade", offersOp);
operations.set("trades", offersOp);


operations.set("accept", {
    communication: true,
    lore: '"Two greedy zots a fair trade make." ~ ancient zot saying',
    shortDescription: `completes a trade (${tradeCost}e)`,
    description: `Completes a trade. Must be within one plot of each other and both parties must have specified resources at time of trade.`
    + ` It will cost ${tradeCost}e. The offered already paid e to post the trade.`
    + ` Specify the trade number from the list of offers or specify partner name. Offers can be posted with the 'offer' command.`

    + `accept:               shows the list of trades\n`
    + `accept <#>:           accepts the trade at # on the list (${tradeCost}e)\n`
    + `accept <playername>:  accepts the trade from player (${tradeCost}e)\n`,

    fn: (args) => george.justAccept(george.id, args)
});

operations.set("seize", { 
    plan: true,
    lore: "A zot wants their plot.",
    shortDescription: `take control of improvements on your land (${seizureCost}e)`,
    description: `Seizure claims ownership of specified improvements at the location of the player, costing ${seizureCost}e.`
                + ` The seized improvements will suffer ${seizureDepreciation} hp damage when being seized.`

    + `seize <all>:         plan to seize all others' improvements at owner's location (${seizureCost}e)\n`
    + `seize <player name>: plan to seize player's improvements at owner's location (${seizureCost}e)\n`,

    fn: (args) => george.planSeize(args),
});


operations.set("attack", { 
    plan: true,
    lore: "TODO",
    shortDescription: `attack (${attackCost}e)`,
    description: `Attacks the specified entity for an energy cost (${attackCost}e).\n\n`

    + `attack <entity name>: plan attack (${attackCost}e)\n`,

    fn: (args) => george.planAttack(args),
});

operations.set("speak", {
    communication: true,
    peek: true,
    lore: "As a zot, it takes great exertion to verbally communicate.",
    shortDescription: `send short message to zots within 1 plot (${speakCost}e)`,
    description: `Sends ${george.maxSpeakingLength} character message to all zots on your current plot.`
    + ` It will be sent immediately and cost ${george.speakCost}.\n\n`

    + `speak <${george.maxSpeakingLength} chars>: talk to your plot mates (${speakCost}e)\n`,

    fn: (args) => george.speak(args, false),
});
const sOp = {...operations.get("speak")};
sOp.hide = true;
operations.set("s", sOp);

operations.set("shout", {
    communication: true,
    peek: true,
    lore: "As a zot, great energy must be spent to verbally communicate.",
    shortDescription: `send short message to all zots on Zearth (${shoutCost}e)`,
    description: `Sends ${george.maxSpeakingLength} character message to all zots everywhere.`
    + ` It will be sent immediately and cost ${george.shoutCost}.\n\n`

    + `shout <${george.maxSpeakingLength} chars>: shout at all zots (${shoutCost}e)\n`,

    fn: (args) => george.speak(args, true),
});



operations.set("vickrey", { 
    hide: true,
    peek: true,
    lore: `The famous zot, Zilliam Vickrey, won the Zobel Price in zeconomics`
        + ` by demonstrating that bidding your expected value is the weakly dominant strategy in a sealed-bid second-price auction.`,
    shortDescription: "what are Vickrey auctions",
    description: "A step by step example working out of the game theory behind Vickrey auctions.",
    
    fn: (args) => addToCurrentInbox(
        `What is a Vickrey auction, you ask? It is a sealed-bid second-price auction.`
        + ` In secret, everyone submits their bid. Then we look at all the bids.`
        + ` The highest bidder wins, but only pays the price of the 2nd highest bid.`
        + ` You can demonstrate mathematically that the weakly dominant winning strategy is to bid your expected value.\n\n`

        + ` Let’s go through a mock auction for a beautiful whale sculpture!\n\n`

        + ` Let’s assume you value the whale sculpture at 1 million dollars.\n\n`

        + ` Let’s think about overbidding, to make sure you win! Say you bid 1.1 million.\n\n`
        
        + `     1. If 2nd highest bid is 1.09 million, you win, and you have to pay 1.09, but you’re unhappy,`
        + ` because you overpaid by .09 million and would rather not have won the whale.\n`
        + `     2. If 2nd highest bid is .9 million, then you win, and you pay .9 million,`
        + ` but you would have won with just bidding your valuation of 1 million.\n`
        + `     3. If highest bid is 1.2 million, then you lose, but you would have lost if you had bid your valuation of 1 million anyway.\n\n`

        + ` Let’s think about underbidding, to see if you can get it cheap! Say you bid .9 million.\n\n`

        + `     1. If 2nd highest bid is .8 million, you win, you pay .8 million and you’re happy, but you could have bid 1 million and been just as happy.\n`
        + `     2. If highest bid is .95 million, you lose, and you’re unhappy,`
        + ` because you would have been willing to pay .95 million yourself, so you could have bid 1 million and won!\n`
        + `     3. If highest bid is 1.1 million, you lose, you’re neutral, because you wouldn’t have been willing to pay 1.1 million.`
        + ` It didn’t matter that you underbid, you would have lost anyway.\n`
    ),
});

operations.set("scoreboard", {
    hide: true,
    lore: `Some zots care about scratchings, some for puppies, some to see all of Zearth for themeselves.`,
    shortDescription: "who's truly winning",
    description: "Lists stats that you might use to determine a winner.",
    fn: (args) => george.checkScoreboard()
});

operations.set("george", { 
    hide: true,
    peek: true,
    lore: `The author of the sacred texts, \"Zogress & Zoverty\" and \"Protection or Zot Trade\"`,
    shortDescription: "words from others",
    description: "Words about George or words from George.",
    
    fn: (args) => addToCurrentInbox(getRandomQuote(textFile)),
});

const textFile = './zenrygeorge.txt';
function getRandomQuote(filePath) {
    // Read the file
    const data = fs.readFileSync(filePath, 'utf8');

    // Split the text into individual quotes
    const quoteBlocks = data.split(';').filter(block => block.trim() !== '');
    
    // Process each quote block and return formatted strings
    return getRandomElement(quoteBlocks.map(block => block.trim()));
}


operations.set("tutorial", {
    spiritual: true,
    peek: true,
    lore: "Advice from a zot.",
    shortDescription: "how to play",
    description: "Explains basic game systems and concepts.",

    fn: function(args) {
        addToCurrentInbox(
            `Tutorial 1:\n`
            + `Type 'look'.\n`
            + `Are there resources on this land?\n`
            + `If so, type 'gather <resource>'.\n`
            + `Now type 'gather', but use only the first letter of the resource.\n`
            + `That's an alias!\n`
            + `Otherwise, try 'look <direction>'.\n`
            + `If it didn't work, try '? look'.\n`
            + `Then 'move <direction>' to go there.\n`
            + `You can move into unknown plots, that's called exploring.\n`
            + `If you type 'gather <resource>' now, it will be performed after your move.\n`
            + `Type 'tutorial2' for more.`
        );
    },
});
const tut1Op = {...operations.get("tutorial")};
tut1Op.hide = true;
operations.set("tutorial1", tut1Op);

operations.set("tutorial2", {
    spiritual: true,
    peek: true,
    hide: true,
    lore: "Advice from a zot.",
    shortDescription: "how to play",
    description: "Explains basic game systems and concepts.",

    fn: function(args) {
        addToCurrentInbox(
            `Tutorial 2:\n`
            + `Type 'look' again.\n`
            + `On the right side, you should see your plans.\n`
            + `When the day starts, these plans are processed.\n`
            + `Each plan has an assocaited energy cost.\n`
            + `If you run out of energy, a plan won't succeed.\n`
            + `There is no penalty for running out of energy.\n`
            + `To cancel last plan, type 'cancel'.\n`
            + `To cancel all plans, type 'cancel all'.\n`
            + `Type 'tutorial3' for more.`
        );
    },
});

operations.set("tutorial3", {
    spiritual: true,
    peek: true,
    hide: true,
    lore: "Advice from a zot.",
    shortDescription: "how to play",
    description: "Explains basic game systems and concepts.",

    fn: function(args) {
        addToCurrentInbox(
            `Tutorial 3:\n`
            + `PLAN COMMANDS cost energy and are scheduled.\n`
            + `COMMUNICATION COMMANDS cost energy, but happen immediately.\n`
            + `INVENTORY COMMANDS are free, happen immediately.\n`
            + `Once a game starts, type '?' to see list of commands.'.\n`
            + `Ok, type '?'.\n`
        );
    },
});

operations.set("tutorial4", {
    spiritual: true,
    peek: true,
    hide: true,
    lore: "Advice from a zot.",
    shortDescription: "how to play",
    description: "Explains basic game systems and concepts.",

    fn: function(args) {
        addToCurrentInbox(
            `Tutorial 4:\n`
            + `Wow, you found tutorial 4 all on your own!\n`
            + `You're doing it!\n`
            + `Type 'energysquare'.\n`
            + `You probably want to craft one of those'.\n`
            + `Next, type 'extraarm'.\n`
        );
    },
});

operations.set("tutorial5", {
    spiritual: true,
    peek: true,
    hide: true,
    lore: "Advice from a zot.",
    shortDescription: "how to play",
    description: "Explains basic game systems and concepts.",

    fn: function(args) {
        addToCurrentInbox(
            `Tutorial 5:\n`
            + `Is your plot crowded?\n`
            + `Do you want exclusive access rights?\n`
            + `Type 'bid a2 5'.\n`
            + `Oh, you don't want a2?\n`
            + `Whoops, that wasted ${bidCost}e.\n`
            + `That will teach you to follow tutorials.\n`
            + `(You can now change your bid in that auction for free tho)\n`
        );
    },
});

operations.set("tutorial6", {
    spiritual: true,
    peek: true,
    hide: true,
    lore: "Advice from a zot.",
    shortDescription: "how to play",
    description: "Explains basic game systems and concepts.",

    fn: function(args) {
        addToCurrentInbox(
            `Tutorial 6:\n`
            + `Aren't you sick of tutorials?\n`
            + `Still not sure what to do? Type 'purpose'.\n`
            + `You know what, type '? <command>' for every command.\n`
            + `Then go read "Progress & Poverty".\n`
        );
    },
});

operations.set("tutorial7", {
    spiritual: true,
    peek: true,
    hide: true,
    lore: "Advice from a zot.",
    shortDescription: "how to play",
    description: "Explains basic game systems and concepts.",

    fn: function(args) {
        addToCurrentInbox(
            `Tutorial 7:\n`
            + `Did you type '? ?'?\n`
        );
    },
});


operations.set("tutorial8", {
    spiritual: true,
    peek: true,
    hide: true,
    lore: "A rhyme every zotling and zot has been taught",
    shortDescription: "an instructive poem",
    description: "\n\"Zot On A Plot\" ~ anonymous",
    fn: function(args) {
        addToCurrentInbox("\n\n"
    + "To GATHER some tobbles and nup is a zot's first thought\n"
    + `And CRAFT for themselves an energy square to keep hot\n`
    + `But putting a square on an unowned plot is fraught\n`
    + `An AUCTION sets the LVT, even a bid of naught\n`
    + `So a smart zot really ought to bid on a plot\n`
    + `And win the rights to a top spot\n`
    + `Then once a zot has got\n`
    + `A square on a plot\n`
    + `They'll be content\n`
    + `But probably not.\n`);
    }
});