import { 
    logDEBUG, 
    logWarning,
    assignPlayerToInbox,
    addToCurrentInbox, 
    addInvalidCurrentInbox, 
    addToPlayerInboxByPlayerName, 
    readCurrentInboxMail,
    addToAllInboxes,
    readAllInboxes, 
    messagePlayerImmediatelyByPlayerName,
    messageAllPlayersImmediately,
    playerInGame,
    playerLeftGame,
    tempLog,
    
} from './output.js';
import { 
    vecToLoc,
    locToVec,
    parseChessNotation, 
    getRandomElement,
    equalArray,
    removeFromArr,
    getRandomInt,
    parseResBit,
    vAdd,
    within1Move,
} from './helpers.js';
import {
    getResourceInfo,
    changeLandResources,
    readTechList,
    tech,
    resCodeToResName,
    shapeLand,
    bloom,
    injectEnergy,
    getInvRes,
    whammerReduction,
    toolWear,
    desertTerrain,
    getClosetSpace,
    grassTerrain,
    forestTerrain,
    oceanTerrain,
    mountainTerrain,
    plannedPosIcon,
    capacityPerArm,
    tradeCost,
    gatherCost,
    speakCost,
    shoutCost,
    craftCost,
    energyPerLung,
    hoverboardWear,
    grassCost,
    oceanCost,
    forestCost,
    desertCost,
    mountainCost,
    backbagCapacity,
    minGather,
    maxGather,
    printClosetDetails,
    injuryCapReduction,
    rodCraftName,
    seizureCost,
    seizureDepreciation,
    bidCost,
    resCodes,
    getagetsName,
    laborers,
    changePlayerResources,
    makeVillages,
    hoverboardName,
    jumpName,
    hammerName,
    move_title,
    craft_title,
    getTerrainMovementCost,
} from './henry.js';
import { georgeDay } from './operationHandler.js';
import { unassignAllMembersJustInCase, assignAllPlayersRole } from './lizzie.js';
import { getScreen, auctionView, inventoryView, normalView, playersView, landView, tradesView } from './screenDrawer.js'




export class George {

    constructor () {

        this.id                     = -1; // Current pid
        this.allowRejoining         = false;
        this.runningBots            = false;

        // Game data
        this.dayClock               = 0;
        this.dawnWarning            = false;
        this.warningSeconds         = 15;
        this.ongoing                = false;
        this.ended                  = false;
        this.isPaused               = false;
        this.dayCount               = 1;
        this.lastSeasonDate         = 0;
        this.publicTreasury         = {
            't':        0,
            'n':        0,
            'w':        0,
            'g':        0,
            'm':        0,
        };
        this.seasonAuctions         = [];
        this.tradeOffers            = [];
        this.closetCubSize          = 100;

        // Player data
        this.playerNames            = [];
        this.deadPlayers            = [];
        this.playerInventories      = [];
        this.playerAccounts         = [];
        this.playerLands            = [];
        this.playerImprovements     = [];
        this.playerPositions        = [];
        this.playerPlannedPositions = [];
        this.playerEnergies         = [];
        this.playerInjuries         = [];
        this.playerPlans            = [];
        this.metaPlans              = [];

        // Settings
        this.secondsPerDay          = 120;
        this.days                   = 30;
        this.taxSeason              = 5;
        this.mapSize                = [6, 6];
        this.energyPerDay           = 25;
        this.startingMaxEnergy      = 50;
        this.secret                 = 30;
        //this.difficulty             = 1;

        // Hidden settings
        this.maxPlans               = 100;
        this.maxSpeakingLength      = 140;
        this.separator              = 'for';
        
        // Map stuff
        this.map                    = [[]];
        this.center                 = [0,0];
        this.highway                = "Highway";
        this.settlement             = "Settlement";
        this.startingTerrain        = [ grassTerrain, grassTerrain, grassTerrain, 
                                        desertTerrain, desertTerrain, desertTerrain, desertTerrain, desertTerrain, desertTerrain,
                                        forestTerrain, forestTerrain, forestTerrain, 
                                        oceanTerrain, oceanTerrain, oceanTerrain,
                                        mountainTerrain]
    }

    checkTime(args) {
        if (this.isPaused) addToCurrentInbox(`Game Paused. There's ${this.getTimeUntilNextDay()}. ${this.getSeasonRemaining()}`);
        else addToCurrentInbox(`There's ${this.getTimeUntilNextDay()}. ${this.getSeasonRemaining()}`);
    }
    
    getSeasonRemaining() {
        const daysLeft = this.getDaysLeft();
        if (daysLeft == 1) return "Season ends today.";
        else return `Season ends in ${daysLeft} days.`;
    }

    getDaysLeft() {
        return this.taxSeason - (this.dayCount - this.lastSeasonDate) + 1;
    }

    getTimeUntilNextDay() {
        const remaining = Math.floor((this.secondsPerDay * 1000 - this.dayClock) / 1000);
        return `${remaining} seconds until Day ${this.dayCount}`;
    }

    pause(args) {
        addToCurrentInbox(this.pauseClock());
        messageAllPlayersImmediately(this.playerNames[this.id] + " paused the game.");
    }

    pauseClock() {
        if (!this.isPaused) {
            this.isPaused = true;
            return `Game Paused. There's ${this.getTimeUntilNextDay()}. ${this.getSeasonRemaining()}`;
        }
        else return `Game was already paused. Try 'resume'. There's ${this.getTimeUntilNextDay()}. ${this.getSeasonRemaining()}`;
    }

    resume(args) {
        addToCurrentInbox(this.resumeClock());
        messageAllPlayersImmediately(this.playerNames[this.id] + " resumed game.");
    }

    resumeClock() {
        if (this.isPaused) {

            if (this.allowRejoining) {
                this.noMoreRejoining();
            }

            this.isPaused = false;
            this.lastClock = new Date();
            return `Game resumed. There's ${this.getTimeUntilNextDay()}. ${this.getSeasonRemaining()}`;
        }
        else return `Game is not paused. Try 'pause'. There's ${this.getTimeUntilNextDay()}. ${this.getSeasonRemaining()}`;
    }

    
    noMoreRejoining() {
        this.allowRejoining = false;
        const cachedId = this.id;
        for (let i = this.playerNames.length - 1; i >= 0; i--) {
            if (this.deadPlayers[i]) {
                messageAllPlayersImmediately("Continuing without player that did not rejoin: " + this.playerNames[i]);
                this.id = i;
                this.leaveGame(['leave']);
            }
        }
        this.id = cachedId;
    }

    debugWealth(args) {
        addToCurrentInbox("RICHIE RICH");
        let inventory = this.playerInventories[this.id];
        this.tryChangePlayerResources(inventory, 't', 99);
        this.tryChangePlayerResources(inventory, 'n', 99);
        this.tryChangePlayerResources(inventory, 'w', 99);
        this.tryChangePlayerResources(inventory, 'g', 99);
        this.tryChangePlayerResources(inventory, 'm', 99);
    }

    debugEnergy(args) {
        const lungTemplate = tech.find(it => it.craftName === 'extralung');
        this.playerInventories[this.id].items.push({ ...lungTemplate });
        this.playerInventories[this.id].items.push({ ...lungTemplate });
        this.playerInventories[this.id].items.push({ ...lungTemplate });
        this.playerInventories[this.id].items.push({ ...lungTemplate });
        this.playerInventories[this.id].items.push({ ...lungTemplate });

        const armTemplate = tech.find(it => it.craftName === 'extraarm');
        this.playerInventories[this.id].items.push({ ...armTemplate });
        this.playerInventories[this.id].items.push({ ...armTemplate });
        this.playerInventories[this.id].items.push({ ...armTemplate });
        this.playerInventories[this.id].items.push({ ...armTemplate });
        this.playerEnergies[this.id] = this.getMaxEnergy(this.id);
        addToCurrentInbox("NRG NRG NRG");
        this.status(['me']);
    }

    startGame(args) {
        if (!this.playerNames || this.playerNames.length === 0) {
            addToCurrentInbox("Cannot start game without players. Use 'join'. Use '? join' for details on joining.");
            return;
        }
        if (this.ongoing) {
            addInvalidCurrentInbox("Can't start a game, one is already running.");
            return;
        }
        if (args[1] == 'reload') {
            logDEBUG("handle reloading");
            return;
        }

        this.ongoing = true;
        this.lastClock = new Date();

        const squareFootage = this.mapSize[0] * this.mapSize[1];
        if (squareFootage > 10) {
            this.map = makeVillages(this.mapSize[0], this.mapSize[1]);
            let x = Math.round(this.mapSize[0] / 2);
            let y = Math.round(this.mapSize[1] / 2);
            this.center = [x, y];
            this.map[x][y].revealed = true;
            for (let i = 0; i < this.playerPositions.length; i++) {
                this.playerPositions[i] = this.center;
                this.playerPlannedPositions[i] = this.center;
                this.map[x][y].playerIds.push(i);
            }
        }
        else {
            let madeGoodMap = false;
            while (!madeGoodMap) {
                madeGoodMap = this.makeMap();
            }
        }   

        addToAllInboxes("Starting game with the following settings:")
        this.settings();
        for (let i = 0; i < this.playerNames.length; i++) {
            this.addToInbox(i, this.getMapForPid(i));
        }
        addToAllInboxes(`On the planet Zearth, a zot imagines itself into being!\n`
        + "Then a small zoot of zots associating in equality.\n"
        + "Each day, the zots try very hard to finish their list of plans.\n"
        + "Each night, the zots make more plans.\n"
        + "Can they achieve progress without poverty?\n");
        addToAllInboxes(`There's ${this.getTimeUntilNextDay()}. ${this.getSeasonRemaining()}`);
        addToAllInboxes("\nMore commands are now available. Type '?' to see.");
        readAllInboxes();
        
        messageAllPlayersImmediately(this.pauseClock());

        assignAllPlayersRole();
    }

    settings(args) {
        if (!args || args.length < 2) {
            let settingPad = 24;
            let valuePad = 0;

            addToCurrentInbox("For details, type '? settings'.\n")
            let setting = "Seconds Per Day:";
            let value = this.secondsPerDay.toString() + " sec";
            let str = `${setting.padEnd(settingPad)} ${value.padStart(valuePad)}`;
            addToCurrentInbox(str);
            setting = "Days:";
            let minutes = Math.round((this.days * this.secondsPerDay) / 60);
            value = `${this.days.toString()} (~${minutes} mins)`;
            str = `${setting.padEnd(settingPad)} ${value.padStart(valuePad)}`;
            addToCurrentInbox(str);
            setting = "Map Size:";
            value = this.mapSize[0] + "x" + this.mapSize[1];
            str = `${setting.padEnd(settingPad)} ${value.padStart(valuePad)}`;
            addToCurrentInbox(str);
            setting = "Energy Per Day:";
            str = `${setting.padEnd(settingPad)} ${this.energyPerDay.toString().padStart(valuePad)}`;
            addToCurrentInbox(str);
            setting = "Starting Max Energy:";
            str = `${setting.padEnd(settingPad)} ${this.startingMaxEnergy.toString().padStart(valuePad)}`;
            addToCurrentInbox(str);
            setting = "Season:";
            str = `${setting.padEnd(settingPad)} ${this.taxSeason.toString().padStart(valuePad)} days`;
            addToCurrentInbox(str);
            setting = "Secret:";
            str = `${setting.padEnd(settingPad)} ${this.secret.toString().padStart(valuePad)}`;
            addToCurrentInbox(str);
            if (!this.ongoing && this.playerNames.length > 0) {
                addToCurrentInbox('');
                this.listPlayers();
            }
        }
        else {

            if (this.ongoing) {
                addToCurrentInbox("Cannot change settings once game has started.")
                this.settings();
            }
            else {

                switch (args[1])
                {
                    case 'secondsperday':
                        let newSecondsPerDay = parseInt(args[2]);
                        if (args.length > 2 && !Number.isNaN(newSecondsPerDay)) {
                            this.secondsPerDay = newSecondsPerDay;
                            addToCurrentInbox("Seconds per day is now " + this.secondsPerDay.toString() + " seconds.");
                        }
                        else addInvalidCurrentInbox(args);
                        break;
                    case 'days':
                        let newDaysInGame = parseInt(args[2]);
                        if (args.length > 2 && !Number.isNaN(newDaysInGame)) {
                            this.days = newDaysInGame;
                            let minutes = Math.round((this.days * this.secondsPerDay) / 60);
                            addToCurrentInbox(`Days set to ${this.days} days (at ${this.secondsPerDay} s/day, that's about ${minutes} minutes).`);
                        }
                        else addInvalidCurrentInbox(args);
                        break;
                    case 'season':
                        let newTaxSeason = parseInt(args[2]);
                        if (args.length > 2 && !Number.isNaN(newTaxSeason)) {
                            this.taxSeason = newTaxSeason;
                            addToCurrentInbox("Season is now " + this.taxSeason.toString() + " days. This is how often nature renews and when the LVT is levied.");
                        }
                        else addInvalidCurrentInbox(args);
                        break;
                    case 'mapsize':
                        let w = parseInt(args[2]);
                        let h = parseInt(args[3]);
                        if (args.length > 3 && !Number.isNaN(w) && !Number.isNaN(h)) {
                            if (w > 26) {
                                w = 26;
                                addToCurrentInbox("Note: width must be 26 or less.");
                            }
                            else if (w < 3) {
                                w = 3;
                                addToCurrentInbox("Note: width must be at least 3.");
                            }
                            if (h > 500) {
                                h = 500;
                                addToCurrentInbox("Note: height must be less than 500 ahaha.");
                            }
                            else if (h < 2) {
                                h = 2;
                                addToCurrentInbox("Note: height must be at least 2");
                            }
                            this.mapSize = [w,h];
                            let ms = this.mapSize[0] + "x" + this.mapSize[1];
                            addToCurrentInbox("Map size is now " + ms + ".");
                        }
                        else addInvalidCurrentInbox(args);
                        break;
                    case 'energyperday':
                        let newEnergyPerDay = parseInt(args[2]);
                        if (args.length > 2 && !Number.isNaN(newEnergyPerDay)) {
                            if (newEnergyPerDay < 1) {
                                addToCurrentInbox("Can't set energy per day less than 1.");
                            }
                            else {
                                this.energyPerDay = newEnergyPerDay;
                                addToCurrentInbox("Energy per day is now " + newEnergyPerDay + ".");
                            }
                        }
                        else addInvalidCurrentInbox(args);
                        break;
                    case 'startingmaxenergy':
                        let newStartingEnergy = parseInt(args[2]);
                        if (args.length > 2 && !Number.isNaN(newEnergyPerDay)) {
                            if (newStartingEnergy < this.energyPerDay) {
                                addToCurrentInbox("Can't set starting max energy to less than energy per day: " + this.energyPerDay + ".");
                            }
                            else {
                                this.startingMaxEnergy = newEnergyPerDay;
                                addToCurrentInbox("Starting max energy is now " + this.startingMaxEnergy + ".");
                            }
                        }
                        else addInvalidCurrentInbox(args);
                        break;
                    case 'secret':
                        let newSecret = parseInt(args[2]);
                        if (args.length > 2 && !Number.isNaN(newSecret)) {
                            this.secret = newSecret;
                            addToCurrentInbox("Secret is now " + newSecret + ".");
                            addToCurrentInbox('A voice from Heaven says, "Interesting decision."');
                        }
                        break;
                    // case 'difficulty':
                    //     let newDifficulty = parseInt(args[2]);
                    //     if (args.length > 2 && !Number.isNaN(newDifficulty)) {
                    //         if (newDifficulty > 3) newDifficulty = 3;
                    //         else if (newDifficulty < 1) newDifficulty = 1;
                    //         this.difficulty = newDifficulty;
                    //         let value = '';
                    //         if      (this.difficulty == 1)  value = "1-easy";
                    //         else if (this.difficulty == 2)  value = "2-normal";
                    //         else if (this.difficulty == 3)  value = "3-hard";
                    //         else {
                    //             addInvalidCurrentInbox(args);
                    //             this.difficulty = 1;
                    //             value = "1-easy";
                    //         }
                    //         addToCurrentInbox("Difficulty is now " + value + ".");
                    //     }
                    //     else addInvalidCurrentInbox(args);
                        break;
                    default:
                        addInvalidCurrentInbox(args);
                        break;
                }
            }
        }
    }

    makeMap() {
        let lastTerrain = '';
        // Only the Creator can make land!

        let gCount = 0;
        let fCount = 0;
        let oCount = 0;
        let mCount = 0;
        let dCount = 0;

        // Ayayay have to clear the map!
        this.map = [];

        // Make land
        for (let i = 0; i < this.mapSize[0]; i++) {
            this.map.push([]);
            for (let j = 0; j < this.mapSize[1]; j++) {
                let randomTerrain = getRandomElement(this.startingTerrain);
                if (lastTerrain == mountainTerrain && Math.random() > .5) randomTerrain = mountainTerrain;
                else if (lastTerrain == desertTerrain && Math.random() > .5) randomTerrain = desertTerrain;
                lastTerrain = randomTerrain;

                const land = {
                    owner:          -1,
                    loc:            vecToLoc([i, j]),
                    pos:            [i, j],
                    lvt:            0,
                    revealed:       false,
                    abandoned:      false,
                    ownerLastBid:   -1,
                    terrain:        randomTerrain,
                    playerIds:      [],
                    rentalTerms:    [],
                    improvements:   [],
                    sources:        shapeLand(randomTerrain),
                    resources: {
                        tobbles:    0,
                        nup:        0,
                        wiggsies:   0,
                        getacles:   0,
                        moaf:       0,
                    },
                };

                
                if (Math.random() > .9) {
                    logDEBUG("blessed " + land.loc);
                    land.sources.tobblerone *= 2;
                    land.sources.nupfields *= 2;
                    land.sources.wigroot *= 2;
                    land.sources.getnests *= 2;
                    land.sources.moafpits *= 2;
                } 

                bloom(land, true);

                if (randomTerrain == grassTerrain)          gCount++;
                else if  (randomTerrain == forestTerrain)   fCount++;
                else if  (randomTerrain == oceanTerrain)    oCount++;
                else if  (randomTerrain == mountainTerrain) mCount++;
                else if  (randomTerrain == desertTerrain)   dCount++;
                this.map[i].push(land);
            }
        }

        let x = Math.round(this.mapSize[0] / 2);
        let y = Math.round(this.mapSize[1] / 2);
        // x += getRandomInt(-3, 3);
        // y += getRandomInt(-3, 3);
        // if (x < 1) x = 1;
        // if (x > this.mapSize[0] - 2) x = this.mapSize[0] - 2;
        // if (y < 1) y = 1;
        // if (y > this.mapSize[1] - 2) y = this.mapSize[1] - 2;
        this.center = [x, y];


        // if (
        //     this.map[x + 1][y].terrain == mountainTerrain && 
        //     this.map[x - 1][y].terrain == mountainTerrain && 
        //     this.map[x][y + 1].terrain == mountainTerrain && 
        //     this.map[x][y - 1].terrain == mountainTerrain) {
        //     return false;
        // }
        // else 
        
        if (gCount < 1 || fCount < 1 || oCount < 1 || mCount < 1 || dCount < 1) {
            logDEBUG(`baad: ${gCount}g ${fCount}f ${oCount}o ${mCount}m ${dCount}d`);
            return false;
        }
        else {

            // Reveal starting town
            //this.map[x - 1][y].revealed = true;
            //this.map[x - 1][y + 1].revealed = true;
            //this.map[x - 1][y - 1].revealed = true;
            this.map[x][y].revealed = true;
            //this.map[x][y + 1].revealed = true;
            //this.map[x][y - 1].revealed = true;
            //this.map[x + 1][y].revealed = true;
            //this.map[x + 1][y + 1].revealed = true;
            //this.map[x + 1][y - 1].revealed = true;

            // Exta reveals!
            for (let i = 0; i < 4; i++) {
                this.map[getRandomInt(0, this.mapSize[0])][getRandomInt(0, this.mapSize[1])].revealed = true;
            }

            for (let i = 0; i < this.playerPositions.length; i++) {
                this.playerPositions[i] = this.center;
                this.playerPlannedPositions[i] = this.center;
                this.map[x][y].playerIds.push(i);
            }

            //logDEBUG("success:" + `${gCount}g ${fCount}f ${oCount}o ${mCount}m ${dCount}d`);
            return true;
        }
    }


    joinGame(args) {
        if (args.length > 2) {
            addToCurrentInbox("Too many names! No spaces. Or are you trying to rejoin?");
        }
        if (args[1]) this.joinAs(args[1]);
        else {
            
            if (this.id < 0) addToCurrentInbox(`To join, provide a name. Try 'join ${getRandomElement(laborers)}'.`);
            else addToCurrentInbox("You're in the game. To change name, enter 'join <new name>'.");
            if (this.playerNames.length > 0) this.listPlayers();
        }
    }

    rejoinGame(args) {
        if (!args[1]) {
            addInvalidCurrentInbox("no player name specified.");
            return;
        }
        if (agrs[1] == 'lizzie') {
            addToCurrentInbox("I am Lizzie. Who are you? There can't be two.");
            return;
        }

        const wantedName = args[1].charAt(0).toUpperCase() + args[1].substring(1);
        const index = this.playerNames.indexOf(wantedName);
        if (index >= 0) {
            this.deadPlayers[index] = false;
            assignPlayerToInbox(wantedName);
            playerInGame(wantedName);
            addToCurrentInbox("Welcome back, " + wantedName + ".");
        }
        else {
            addToCurrentInbox(`${wantedName} wasn't in the game you reloaded. Check 'players'.`);
        }
    }

    joinAs(wantedName) {

        if (wantedName.length < 3 || wantedName.length > 16) {
            addToCurrentInbox(`You must join with a name that is 3 to 16 letters long. Try 'join henry'.`);
            return;
        }

        function sanitizeName(name) {
            let sanitized = name.replace(/```/g, '');
            sanitized = sanitized.replace(/^\/+/, '');
            sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');
            sanitized = sanitized.trim();
            return sanitized;
        }

        const properName = wantedName.charAt(0).toUpperCase() + wantedName.slice(1);
        const sanitizedName = sanitizeName(properName);
        const dirty = properName != sanitizedName;
        let nameAvailable = true;
        for (let i = 0; i < this.playerNames.length; i++) {
            if (this.playerNames[i] == sanitizedName) {
                nameAvailable = false;
                break;
            }
        }

        if (sanitizeName == "Lizzie") {
            addToCurrentInbox(`You can't be Lizzie.`);
            return; ////////////////////////////
        }
        if (!nameAvailable) {
            addToCurrentInbox(`${sanitizedName} is not available.`);
            return; ////////////////////////////
        }

        if (this.id >= 0) {
            // Changing name
            const oldName = this.playerNames[this.id];
            messageAllPlayersImmediately(`${oldName} shall now be known as ${sanitizedName}.`);
            this.playerNames[this.id] = sanitizedName;
            assignPlayerToInbox(sanitizedName);
        }
        else {
            this.playerNames.push(sanitizedName);
            this.deadPlayers.push(false);
            this.playerInventories.push({
                tobbles:    0,
                nup:        0,
                wiggsies:   0,
                getacles:   0,
                moaf:       0,
                items:      [],
                travelStat:         0,
                injuryStat:         0,
                chatStat:           0,
                exploreStat:        0,
                lifetimeLVTPaid:    0,
                debt:               0,
            });
            this.playerAccounts.push({
                tobbles:    0,
                nup:        0,
                wiggsies:   0,
                getacles:   0,
                moaf:       0,
            });
            this.playerLands.push([]);
            this.playerPositions.push([0,0]);
            this.playerImprovements.push([]);
            this.playerPlannedPositions.push([0,0]);
            this.playerEnergies.push(this.energyPerDay);
            this.playerInjuries.push(0);
            this.playerPlans.push([]);
            this.metaPlans.push({ready: false, unknownEnergies: 0, yesterday: null});

            this.id = this.playerNames.length - 1;

            assignPlayerToInbox(sanitizedName); // Must be done before playerInGame called
            playerInGame(sanitizedName);

            if (this.ongoing) {

                this.playerPositions[this.id] = this.center;
                this.playerPlannedPositions[this.id] = this.center;
                this.map[this.center[0]][this.center[1]].playerIds.push(this.id);

                addToCurrentInbox(`You joined as \"${sanitizedName}\". Enter 'settings' to view game settings.\n\n${this.getPlayers()}`);

                if (this.dayCount < 2) addToCurrentInbox(`It's only Day ${this.dayCount}.`);
                else addToCurrentInbox(`It's already Day ${this.dayCount}.`);
                addToCurrentInbox(`Enter 'map' to look around'.`);
                addToCurrentInbox(`Enter '?' for help.`);

                messageAllPlayersImmediately(`${sanitizedName} has joined.`, true);
            }
            else {

                addToCurrentInbox(`You joined as \"${sanitizedName}\".`)

                if (this.playerNames.length == 1) addToCurrentInbox(`Wait for more players or enter 'start' to play solo.\nEnter 'settings' to view game settings.`);
                else addToCurrentInbox(`Enter 'start' to begin game.\nEnter 'settings' to view game settings.\n\n${this.getPlayers()}`);

                messageAllPlayersImmediately(`${sanitizedName} has joined.\n\n${this.getPlayers()}`, true);
            }
        }
        if (dirty) addToCurrentInbox("(Certain characters were removed from your name.)");
    }

    debugRevealMap(args) {
        if (args[1] == 'force') addToCurrentInbox(this.getMapForPid(this.id, true, true));
        else addToCurrentInbox(this.getMapForPid(this.id, true));
    }

    debugWarp(args) {
        if (args.length < 2) {
            addToCurrentInbox("what loc?");
            return;
        }
        const coord = parseChessNotation(args[1], this.mapSize)
        if (coord.valid) {
            
            const newLand = this.getLandAtPos([coord.x, coord.y]);
            const oldLand = this.getLandByPid(this.id);
            removeFromArr(oldLand.playerIds, this.id);
            newLand.playerIds.push(this.id);

            this.playerPositions[this.id] = [coord.x, coord.y];
            this.playerPlannedPositions[this.id] = [coord.x, coord.y];
            addToCurrentInbox("Warped to " + args[1]);
        }
    }

    debugKick(args) {
        const playerName = args[1];
        if (!playerName) {
            addToCurrentInbox("Can't kick 'null' playerName?");
            return;
        }
        let index = this.playerNames.find(p => p == playerName);
        const cachedId = this.id;
        if (index >= 0) {
            this.id = index;
            this.leaveGame(['leave']);
        }
        else logDEBUG("Failed to kick '" + playerName + "' from game.");
        this.id = cachedId;
    }

    leaveGame(args) {

        if (this.id < 0) {
            addToCurrentInbox("Can't leave, you're haven't joined.");
            return;
        }

        if (this.allowRejoining) {
            this.deadPlayers[this.id] = true;
            addToCurrentInbox(`You left the game and will not takeover as ${leaver}.`)
            messageAllPlayersImmediately(`The player who was going to take over for ${leaver} has left the game.`);
            playerLeftGame(leaver);
            return; /////////////////////////
        }

        // If game is running, game state must be updated
        if (this.ongoing) {

            // Take off map
            const pos = this.getPos(this.id);
            const leaveLand = this.map[pos[0]][pos[1]];
            removeFromArr(leaveLand.playerIds, this.id);
            // Damn, we'd need to track where they had renters at #TODO

            // Disown land
            this.playerLands[this.id].forEach(land => {
                land.rentalTerms.forEach(r => {
                    gj.messagePidImmediately(r.pid, `Your rental agreement at ${land.loc} has been voided due to owner leaving game. Land is unowned.`);
                });
                land.rentalTerms = [];
                land.owner = -1;
                land.ownerLastBid = 0;
                land.abandoned = false;
            });

            this.playerImprovements[this.id].forEach(imp => {
                const impLand = this.getLandByLoc(imp.loc);
        
                removeFromArr(impLand.improvements, imp);
            });

            // Trades? They'll safe prune

            // Bids must be removed!
            this.seasonAuctions.forEach(a => {
                let index = -1;
                for (let i = 0; i < a.bids.length; i++) {
                    const bid = a.bids[i];
                    if (bid.pid == this.id) {
                        index = i;
                        break;
                    }
                }
                if (index >= 0) a.bids.splice(index, 1);
            });
        }

        this.messagePidImmediately(this.id, `You left the game.`)

        const leaver = this.playerNames[this.id];

        this.playerNames.splice(this.id, 1);
        this.deadPlayers.splice(this.id, 1);
        this.playerInventories.splice(this.id, 1);
        this.playerAccounts.splice(this.id, 1);
        this.playerLands.splice(this.id, 1);
        this.playerImprovements.splice(this.id, 1);
        this.playerPositions.splice(this.id, 1);
        this.playerPlannedPositions.splice(this.id, 1);
        this.playerEnergies.splice(this.id, 1);
        this.playerInjuries.push(this.id, 1);
        this.playerPlans.splice(this.id, 1);
        this.metaPlans.splice(this.id, 1);

        messageAllPlayersImmediately(`${leaver} left the game.`);
        playerLeftGame(leaver);

        if (this.playerNames.length === 0 && this.ongoing) {
            addToAllInboxes("Everyone left, so it's game over.");
            this.concludeGame();
            this.endGame();
        }
    }

    concludeGame() {
        this.pauseClock();
        this.checkTime();
        for (let i = 0; i < this.playerNames[i]; i++) {
            this.showScoreboard(i);
        }
    }

    endGame() {
        this.ongoing = false;
        this.ended = true;
        this.playerNames.forEach(playerName => {
            playerLeftGame(playerName);
        });
        unassignAllMembersJustInCase();
    }

    checkScoreboard(args) {
        this.showScoreboard(this.id);
    }

    showScoreboard(pid) {

        let puppyLovers = [];
        let mostPuppiesCount = 0;
        let artCollectors = [];
        let mostScratchingsCount = 0;
        let topExplorers = [];
        let mostExploredCount = 0;
        let hypochondriacs = [];
        let mostInjuries = 0;
        let chattiest = [];
        let mostChatCount = 0;

        let playerPoints = [];

        let totalCD = 0;
        
        for (let i = 0; i < this.playerNames.length; i++) {
            const inv = this.playerInventories[i];
            const sCount = inv.items.filter(it => it.craftName == 'scratching').length;
            if (sCount > mostScratchingsCount) {
                mostScratchingsCount = sCount;
                artCollectors = [this.playerNames[i]];
            }
            else if (sCount == mostScratchingsCount) artCollectors.push(this.playerNames[i]);

            const pCount = inv.items.filter(it => it.craftName == 'puppy').length;
            if (pCount > mostPuppiesCount) {
                mostPuppiesCount = pCount;
                puppyLovers = [this.playerNames[i]];
            }
            else if (pCount == mostPuppiesCount) puppyLovers.push(this.playerNames[i]);

            const injuryCount = inv.injuryStat;
            if (injuryCount > mostInjuries) {
                mostInjuries = injuryCount;
                hypochondriacs = [this.playerNames[i]];
            }
            else if (injuryCount == mostInjuries) hypochondriacs.push(this.playerNames[i]);

            const exploreCount = inv.exploreStat;
            if (exploreCount > mostExploredCount) {
                mostExploredCount = exploreCount;
                topExplorers = [this.playerNames[i]];
            }
            else if (exploreCount == mostExploredCount) topExplorers.push(this.playerNames[i]);

            const chatCount = inv.chatStat;
            if (chatCount > mostChatCount) {
                mostChatCount = chatCount;
                chattiest = [this.playerNames[i]];
            }
            else if (chatCount == mostChatCount) chattiest.push(this.playerNames[i]);
            totalCD += inv.lifetimeLVTPaid;




            let playerScore = {playerName: this.playerNames[i], points: 0, puppies: 0, scratchings: 0, videoGames: 0, chapter: 0};
            this.playerInventories[i].items.forEach(it => {
                if (it.luxury > 0) {
                    playerScore.points += it.luxury;
                    if (it.craftName == 'puppy') playerScore.puppies++;
                    else if (it.craftName == 'scratching') playerScore.scratchings++;
                    else if (it.craftName == 'videogame') playerScore.videoGames++;
                    else if (it.craftName == 'chapter') playerScore.chapter++;
                }
            });
            this.playerImprovements[i].forEach(imp => {
                if (imp.craftName == 'entroset') {
                    imp.items.forEach(it => {
                        playerScore.points += it.luxury;
                        if (it.craftName == 'puppy') playerScore.puppies++;
                        else if (it.craftName == 'scratching') playerScore.scratchings++;
                        else if (it.craftName == 'videogame') playerScore.videoGames++;
                        else if (it.craftName == 'chapter') playerScore.chapter++;
                    });
                }
            });
            playerPoints.push(playerScore);
        }

        function formatHonoraries(array) {
            if (array.length == 1) return array[0];
            else if (array.length == 2) return `${array[0]} and ${array[1]}`;
            else {
                let str = '';
                for (let j = 0; j < array.length; j++) {
                    str += array[j] + ', ';
                }
                str += `and ${array[array.length - 1]}`;
                return str;
            }
        }
        
        // if (mostPuppiesCount > 0) {
        //     let verb =  (puppyLovers.length > 1) ? 'have' : 'has';
        //     this.addToInboxByPid(pid, `Most puppies: ${formatHonoraries(puppyLovers)} ${verb} a flock of ${mostPuppiesCount} puppies`);
        // }
        // else addToAllInboxes(`Most puppies: (you guys hate puppies)`);
        // if (mostScratchingsCount > 0) {
        //     let verb = (artCollectors.length > 1) ? 'have' : 'has';
        //     this.addToInboxByPid(pid, `Most scratchings: ${formatHonoraries(artCollectors)} ${verb} a collection of ${mostScratchingsCount} beautiful scratchings`);
        // }
        // else this.addToInboxByPid(pid, `Most scratchings: (no one cares about beauty, it seems)`);
        if (mostExploredCount > 0) {
            this.addToInbox(pid, `Most explored: ${formatHonoraries(topExplorers)} explored ${mostExploredCount} plots`);
        }
        else this.addToInbox(pid, `Most traveled: (a bunch of basement dwellers)`);
        if (mostInjuries > 0) {
            this.addToInbox(pid, `Most injured: ${formatHonoraries(hypochondriacs)} sustained ${mostInjuries} injuries`);
        }
        else this.addToInbox(pid, `Most injured: ("No pain no gain" ~Henry George)`);
        if (mostChatCount > 0) {
            this.addToInbox(pid, `Most messages: ${formatHonoraries(chattiest)} spoke or shouted ${mostChatCount} times`);
        }
        else this.addToInbox(pid, `Most messages: (you're all strong, very silent types)`);
        this.addToInbox(pid, `The zoot paid Land Value Taxes of ${totalCD} resources, which was returned to society as a Citizen's Dividend.`);

        playerPoints.sort((a, b) => b.points - a.points);
        let i = 1;
        let lastPoints = 0;
        playerPoints.forEach(pp => {
            this.addToInbox(pid, `${i}. ${pp.playerName}:`.padEnd(16) + pp.points + ` points`);
            this.addToInbox(pid, 
              `puppies: ${pp.puppies}(${pp.puppies * 7}), `
            + `scratchings: ${pp.scratchings}(${pp.scratchings * 10}), `
            + `video games: ${pp.videoGames}(${pp.videoGames * 1}), `
            + `chapters: ${pp.videoGames}(${pp.videoGames * 1})`);
            if (lastPoints > pp.points) i++;
        });
    }

    playersCommand() {
        if (this.id >= 0 && this.ongoing) {
            this.viewPlayers(this.id);
        } 
        else addToCurrentInbox(this.getPlayers());
    }

    listPlayers() {
        addToCurrentInbox(this.getPlayers());
    }

    getPlayers() {

        if (this.playerNames.length == 0) {
            return "No players have joined. Enter 'join <name>' to join.";
        }

        let str = 'Players:';

        if (this.ongoing) {
            str += '\n';
            for (let i = 0; i < this.playerNames.length; i++) {
                const playerName = this.playerNames[i];
                str += (i + 1) + ". " + playerName + " is at " + this.getPlayerLoc(i);
                logDEBUG("Dead: " + this.deadPlayers[i])
                if (this.deadPlayers[i]) str += " (available)";
                if (this.metaPlans[i].ready) str += " (ready)";
                str += '\n';
            }
        }
        else {
            str = "Players Joined:\n";
            for (let i = 0; i < this.playerNames.length; i++) {
                const playerName = this.playerNames[i];
                str += (i + 1) + ". " + playerName;
                if (this.deadPlayers[i]) str += " (available)";
                str += '\n';
            }
            str += "(type 'start' when ready)";
        }
        return str;
    }

    status(args) {

        if (!this.ongoing || this.id < 0) {
            const playerName = this.playerNames[this.id];
            if (playerName) addToCurrentInbox(`You are ${playerName}.`);
            else addToCurrentInbox(`Can't use '${args[0]}' command until you 'join' the game.`);
            return; /////////////////////////////
        }

        // i: lists + commands
        if (args.length < 2) {
            //this.statusOf(this.id, false);
            this.viewInventory(this.id);
            return; /////////////////////////////
        }

        // i # #: reorder
        // i #: try use at #
        const inv = this.playerInventories[this.id];
        const a = parseInt(args[1]);
        const b = parseInt(args[2]);
        if (this.isNum(a, 1, inv.items.length + 1) && this.isNum(b, 1, inv.items.length + 1)) {
            // Changing order
            const item = inv.items.splice(a - 1, 1)[0]; // Cut it out
            inv.items.splice(b - 1, 0, item) // Insert it
            addToCurrentInbox(`Moved ${item.displayName} to position #${b}.`);
        }
        else if (this.isNum(a, inv.items.length + 1) && args[2] == 'use') {
            this.itemUse(pid, inv[a]);
        }
        else addToCurrentInbox("Couldn't parse command. Was item # wrong? Use 'i' to view inventory.");
    }

    // statusOf(targetPid, thirdPerson) {
        
    //     this.checkTime();

    //     let you = "You";
    //     let are = "You are";
    //     let plan = "You plan";
    //     let have = "You have";
    //     let hold = "You hold";
    //     let possess = "Your";

    //     if (thirdPerson) {
    //         const pName = this.playerNames[targetPid];
    //         you = pName;
    //         are = `${pName} is`;
    //         plan = `${pName} plans`;
    //         have = `${pName} has`;
    //         hold = `${pName} holds`;
    //         possess = `${pName}'s`;
    //     }
    //     else addToCurrentInbox(`${are} ${this.playerNames[targetPid]}`);
        
    //     addToCurrentInbox(`${are} at ${vecToLoc(this.playerPositions[targetPid])}`);
    //     addToCurrentInbox(`${plan} to be at ${vecToLoc(this.playerPlannedPositions[targetPid])}`);
    //     addToCurrentInbox(`${have} ${this.playerEnergies[targetPid]} energy out of ${this.getMaxEnergy(targetPid)}.`);
    //     addToCurrentInbox(`${have} ${this.playerPlans[targetPid].length} plans made.`);

    //     const overburdened = this.getPlayerInventoryCount(targetPid) > this.getCapacity(targetPid) ? " (overburdened)" : '';
    //     addToCurrentInbox(`${are} carrying ${this.getPlayerInventoryCount(targetPid)}/${this.getCapacity(targetPid)} resources${overburdened}.`);
    //     if (this.playerInjuries[targetPid] == 0) addToCurrentInbox(`${are} uninjured.`);
    //     else addToCurrentInbox(`${have} ${this.playerInjuries[targetPid]} injuries (reduces carrying capacity).`);

    //     const inv = this.playerInventories[targetPid];
    //     let pad = 12;
    //     let lastPad = 8;
    //     addToCurrentInbox(`${hold} the following resources:`);
    //     addToCurrentInbox("   tobbles".padEnd(pad)  + inv.tobbles.toString().padStart(lastPad));
    //     addToCurrentInbox("   nup".padEnd(pad)      + inv.nup.toString().padStart(lastPad));
    //     addToCurrentInbox("   wiggsies".padEnd(pad) + inv.wiggsies.toString().padStart(lastPad));
    //     addToCurrentInbox("   getacles".padEnd(pad) + inv.getacles.toString().padStart(lastPad));
    //     addToCurrentInbox("   moaf".padEnd(pad)     + inv.moaf.toString().padStart(lastPad));
        
    //     const lands = this.playerLands[targetPid];
    //     if (lands.length == 0) addToCurrentInbox(`${possess} plots of land: none`);
    //     else addToCurrentInbox(`${possess} plots of land:`);
    //     let i = 1;
    //     for (let index = 0; index < lands.length; index++) {
    //         const land = lands[index];
    //         addToCurrentInbox(`   ${i}. ${land.loc} '${land.terrain}'`);
    //         i++;
    //     }

    //     if (inv.items.length == 0) addToCurrentInbox(`${possess} items: none`);
    //     else addToCurrentInbox(`${possess} items:`);
    //     i = 1;
    //     for (let index = 0; index < inv.items.length; index++) {
    //         const element = inv.items[index];
    //         addToCurrentInbox("   " + i + ". " + element.displayName + ` (${element.hp} hp)`);
    //         i++;
    //     }
    // }

    // getResources(pid) {
    //     let inventory = this.playerInventories[pid];
    //     let str = 
    //     `${inventory.tobbles} tobbles, ` + 
    //     `${inventory.nup} nup, ` + 
    //     `${inventory.wiggsies} wiggsies, ` + 
    //     `${inventory.getacles} getacles, ` + 
    //     `${inventory.moaf} moaf.`;
    //     return str;
    // }

    showMap(args) {
        if (!this.ongoing) {
            addInvalidCurrentInbox("Can't show map until game is running");
            return;
        }
        if (this.id < 0) {
            addToCurrentInbox("Here's the map for player 1.");
            addToCurrentInbox(this.getMapForPid(0));
            return;
        }

        addToCurrentInbox(this.getMapForPid(this.id));
    }

    getMapForPid(contextPid, reveal=false, forceReveal=false) {
        let str = `Map of Zearth:\n`;
        str += `The 'z' represents one or more other zots.\n`;
        if (contextPid < 0) {}
        else {
                str += "The '@' is you, located at " + vecToLoc(this.playerPositions[contextPid]) + ".";
            if (!equalArray(this.playerPlannedPositions[contextPid], this.playerPositions[contextPid])) {
                str += `\nThe '${plannedPosIcon}' is your planned location at ` + vecToLoc(this.playerPlannedPositions[contextPid]) + ".";
            }
        }

        // Place horizontal line
        str += "\n";
        str += "   "; // Start 3 spaces over for row numbers
        for (let i = 0; i < this.mapSize[0] * 4; i++) {
            str += "_";
        }
        str += "_";

        // We go row by row, start at top row
        for (let j = this.mapSize[1] - 1; j >= 0; j--) {
            
            
            // Then column by column
            let rowNum = j + 1;
            if (rowNum < 10)            str += "\n  " + rowNum + "|";
            else if (rowNum < 100)      str += "\n " + rowNum + "|";
            else                        str += "\n" + rowNum + "|";

            for (let i = 0; i < this.mapSize[0]; i++) {
                
                const land = this.map[i][j];
                if (forceReveal) land.revealed = true;
                let hasContextPlayer = false;
                let hasOthers = false;
                let hasYourPlannedPos = false;
                if (land.playerIds.length > 0) {
                    land.playerIds.forEach(pid => {
                        if (pid == contextPid) hasContextPlayer = true;
                        else hasOthers = true;
                    });
                }
                if (contextPid >= 0) {
                    let pos = this.getPos(contextPid);
                    let plannedPos = this.playerPlannedPositions[contextPid];
                    if (!equalArray(pos, plannedPos) && equalArray([i, j], plannedPos)) {
                        hasYourPlannedPos = true;
                    }
                }
                if (hasOthers) str += "z";
                else str += '_';

                if (land.revealed || reveal) str += land.terrain;
                else str += '_';

                if (hasContextPlayer) str += '@|';
                else if (hasYourPlannedPos) str += `${plannedPosIcon}|`;
                else str += '_|';
            }
        }
        str += "\n";

        // Place column numbers
        str += "   "; // Shift over 3 spaces for row numbers
        for (let i = 0; i < this.mapSize[0]; i++) {
            str += '  ' + String.fromCharCode(64 + i + 1).toLowerCase() + ' ';
        }

        str += "\n";
        return str;
    }

    look(args) {

        if (args[0] == 'plans') args = [args[0]];
 
        if (args.length > 1) {
            const possibleName = args[1].charAt(0).toUpperCase() + args[1].substring(1);
            let index = this.playerNames.indexOf(possibleName);
            if (index >= 0) {
                //this.statusOf(index, true);
                this.viewAPlayer(this.id, index);
                return;
            }
        }

        let specifiedPlot = false;
        let pos = this.playerPositions[this.id];
        let coord = { x: pos[0], y: pos[1], valid: true };
        if (args.length > 1) {
            let pos = this.playerPositions[this.id];
            let directionalInput = null;
            if (['ul', 'upleft', 'nw', 'northwest'].includes(args[1])) {
                pos = vAdd(pos, [-1,1]);
                directionalInput = vecToLoc(pos);
            }
            else if (['u', 'up', 'n', 'north'].includes(args[1])) {
                pos = vAdd(pos, [0,1]);
                directionalInput = vecToLoc(pos);
            }
            else if (['ur', 'upright', 'ne', 'northeast'].includes(args[1])) {
                pos = vAdd(pos, [1,1]);
                directionalInput = vecToLoc(pos);
            }
            else  if (['r', 'right', 'e', 'east'].includes(args[1])) {
                pos = vAdd(pos, [1,0]);
                directionalInput = vecToLoc(pos);
            }
            else if (['dr', 'downright', 'se', 'southeast'].includes(args[1])) {
                pos = vAdd(pos, [1,-1]);
                directionalInput = vecToLoc(pos);
            }
            else if (['d', 'down', 's', 'south'].includes(args[1])) {
                pos = vAdd(pos, [0,-1]);
                directionalInput = vecToLoc(pos);
            } 
            else if (['dl', 'downleft', 'sw', 'southwest'].includes(args[1])) {
                pos = vAdd(pos, [-1,-1]);
                directionalInput = vecToLoc(pos);
            }
            else  if (['l', 'left', 'w', 'west'].includes(args[1])) {
                pos = vAdd(pos, [-1,0]);
                directionalInput = vecToLoc(pos);
            }
            
            const plotArg = directionalInput ? directionalInput : args[1];
            specifiedPlot = true;
            coord = parseChessNotation(plotArg, this.mapSize, true);
            if (!coord.valid) {
                addToCurrentInbox(coord.warning);
                return;
            }
        }
        let land = this.map[coord.x][coord.y];
        this.viewPlot(this.id, land.loc);
    }

    itemUse(args) {

        if (this.ongoing && this.id < 0) {
            addToCurrentInbox(`Can't view specifics of ${args[0]} if you're not playing. To join, use 'join <player name>'.`);
            readTechList(null);
        }
        else if (!this.ongoing) {
            addToCurrentInbox(`Can't view specifics of ${args[0]} before starting. To join, use 'join <player name>'.`);
            readTechList(null);
        }

        // args[0] is craftName
        // args[1] check for 'use'

        if (!args[1]) {
            this.planCraft(['craft', '?', args[0]]);
            return; ////////////////////////////////////////
        }
        else if (args[1] != 'use') {
            addToCurrentInbox(`Coulnd't parse '${args[1]}'. Did you mean 'use ${args[1]}'?`);
            return; ////////////////////////////////////////
        }

        this.useItem(['use', args[0]]);
    }

    useItem(args) {

        if (args.length < 2) {
            addToCurrentInbox("What did you want to use? Try 'use inject'.");
            return; //////
        }

        const pid = this.id;
        const inv = this.playerInventories[this.id];
        if (!inv) {
            logDEBUG("useItem: Can't find inventory for " + pid);
            return; ///////////////////////////////////////
        }

        const item = inv.items.find(it => it.craftName == args[1]);
        if (!item) {
            if (args[0] == 'inject') addToCurrentInbox(`Don't have an ${args[1]} to use.`);
            else addToCurrentInbox(`Don't have a ${args[1]} to use.`);
            return;
        }


        if (item.craftName == 'inject') {
            let gain = injectEnergy;
            const has = this.playerEnergies[pid];
            const max = this.getMaxEnergy(pid);
            if (gain + has > max) {
                gain = max - has;
                this.playerEnergies[pid] += gain;
                this.addToInbox(pid, `Used inject. Only gained ${gain} energy. You have ${this.playerEnergies[pid]}/${this.getMaxEnergy(pid)} energy.`);
            } 
            else {
                this.playerEnergies[pid] += gain;
                this.addToInbox(pid, `Used inject. Gained ${gain} energy. You have ${this.playerEnergies[pid]}/${this.getMaxEnergy(pid)} energy.`);
            }
            removeFromArr(inv.items, item);
        }
        else if (item.craftName == 'droplet') {
            if (this.playerInjuries[pid] > 0) {
                this.playerInjuries[pid]--;
                this.addToInbox(pid, "Healed an injury. Your carrying capacity is " + this.getCapacity(pid) + ".");
                removeFromArr(inv.items, item);
            }
            else this.addToInbox(pid, "Not injured, don't waste a droplet! Your carrying capacity is " + this.getCapacity(pid) + ".");
        }
        else this.addToInbox(pid, "No active use for " + item.craftName + ".");
    }

    // Returns leftover count
    tryStashResources(pid, resCode, toStash, overrideLand=null) {
        if (!resCodes.includes(resCode)) {
            this.addToInbox(pid, "Can't stash unknown resource: " + resCode + ".");            
            return toStash;
        }
        if (!this.isNum(toStash)) {
            this.addToInbox(pid, "Can't stash unknown amount: " + toStash + ".");
            return toStash;
        }
        const land = overrideLand ? overrideLand : this.getLandByPid(pid);
        if (!land) {
            this.addToInbox(pid, "Can't stash at unknown land for pid: " + pid + ".");
            return toStash;
        }

        const closets = land.improvements.filter(imp => imp.craftName == 'ploset' && imp.hp > 0 && imp.owner == pid);
        for (let i = 0; i < closets.length; i++) {
            const closet = closets[i];
            const space = getClosetSpace(closet);
            if (space > 0) {
                if (space > toStash) {
                    closet[resCode] += toStash;
                    toStash = 0;
                    closet.details = printClosetDetails(closet);
                    break;
                }
                else {
                    closet[resCode] += space;
                    toStash -= space;
                    closet.details = printClosetDetails(closet);
                }
            }
        }
        return toStash;
    }

    // Returns how many were taken
    tryTakeResources(pid, resCode, wanted) {
        if (!resCodes.includes(resCode)) {
            this.addToInbox(pid, "Can't take unknown resource: " + resCode + ".");            
            return -1;
        }
        if (!this.isNum(wanted)) {
            this.addToInbox(pid, "Can't take unknown amount: " + wanted + ".");
            return -1;
        }
        const land = this.getLandByPid(pid);
        if (!land) {
            this.addToInbox(pid, "Can't take at unknown land for pid: " + pid + ".");
            return -1;
        }
        if (land.owner != pid) {
            this.addToInbox(pid, "Can't take at land not owned by: " + this.playerNames[pid] + ".");
            return -1;
        }

        let stillWant = wanted;
        const closets = land.improvements.filter(imp => imp.craftName == 'ploset' && imp.hp > 0 && imp.owner == pid);
        for (let i = 0; i < closets.length; i++) {
            const closet = closets[i];
            const has = closet[resCode];
            if (stillWant <= has) {
                closet[resCode] -= stillWant;
                stillWant = 0;
                closet.details = printClosetDetails(closet);
                break;
            }
            else {
                closet[resCode] = 0;
                stillWant -= has;
                closet.details = printClosetDetails(closet);
            }
        }

        return wanted - stillWant;
    }

    stash(args) {
        if (args.length < 2) {
            addToCurrentInbox("Try 'stash 5n' or '? stash'.");
            return;
        }

        const resBit = parseResBit(args[1]);
        if (resBit) {
            // Stash resources
            const inv = this.playerInventories[this.id];
            const available = getInvRes(inv, resBit.resCode);
            if (available < resBit.quantity) {
                addToCurrentInbox(`Only had ${available}${resBit.resCode} available to stash.`)
                resBit.quantity = available;
            }

            const leftover = this.tryStashResources(this.id, resBit.resCode, resBit.quantity);
            if (leftover < 0) {
                // Whoops...
            }
            else if (leftover == resBit.quantity) {
                // No room
                addToCurrentInbox(`You found no room to stash your ${resBit.quantity}${resBit.resCode}.`);
            }
            else if (leftover == 0) {
                // All of it
                this.tryChangePlayerResources(inv, resBit.resCode, -resBit.quantity);
                addToCurrentInbox(`You stashed your ${resBit.quantity}${resBit.resCode}.`);
            }
            else {
                // Some of it
                this.tryChangePlayerResources(inv, resBit.resCode, -(resBit.quantity - leftover));
                addToCurrentInbox(`You stashed only ${resBit.quantity - leftover}${resBit.resCode}.`);
            }
        }
        if (tech.find(it => it.craftName == args[1])) {
            // Freeze item
            const inv = this.playerInventories[this.id];
            let index = -1;
            for (let i = 0; i < inv.items.length; i++) {
                const it = inv.items[i];
                if (it.craftName == args[1]) {
                    index = i;
                    break;
                }
            }
            if (index < 0) {
                this.addToInbox(pid, "You can't stash " + args[1] + ". You don't have one on you.");
                return;
            }

            const possession = inv.items[index];
            if (this.tryStashItem(pid, possession, land)) inv.items.splice(index, 1);
        }
    }

    tryStashItem(pid, item, land) {
        const imps = land.improvements;
        const entroset = imps.find(imp => imp.craftName == 'entroset' && imp.hp > 0 && land.owner == pid);
        if (!entroset) {
            this.addToInbox(pid, `Can't stash ${item.displayName}. No owned entroset on this land.`);
            return false;
        }

        // Assert
        if (entroset.items.includes(item)) logDEBUG("stashing duplicate item in entroset");

        // Do the freeze
        entroset.items.push(item);
        addToCurrentInbox(`You froze a ${item.displayName} in an entroset.`);
        return true;
    }

    take(args) {
        const resBit = parseResBit(args[1]);
        if (resBit) {
            const inv = this.playerInventories[this.id];
            const taken = this.tryTakeResources(this.id, resBit.resCode, resBit.quantity);
            if (taken < 0) {
                // Whoops...
            }
            else if (taken == 0) {
                // Took none
                addToCurrentInbox(`You took none. No ${resBit.resCode} in closets.`);
            }
            else if (taken < resBit.quantity) {
                // Took some
                this.tryChangePlayerResources(inv, resBit.resCode, taken);
                addToCurrentInbox(`You only took ${taken}, since that's what was in the closets.`);
            }
            else {
                // Took all
                this.tryChangePlayerResources(inv, resBit.resCode, taken);
                addToCurrentInbox(`You took ${resBit.quantity}${resBit.resCode}.`);
            }
        }
        else {
            if (tech.find(it => it.craftName == args[1])) {
                // Thaw item
                const entrosets = imps.filter(imp => imp.craftName == 'entroset' && imp.hp > 0);
                if (entrosets.length == 0) {
                    addToCurrentInbox("Can't take items, no owned entrosets on this land.");
                    return;
                }

                let foundItemToTake = false;
                entrosets.forEach(set => {
                    let index = -1;
                    for (let i = 0; i < set.items.length; i++) {
                        const it = set.items[i];
                        if (it.craftName == args[1]) {
                            index = i;
                            break;
                        }
                    }

                    if (index >= 0) {
                        // We found a matching item, woohoo
                        this.playerInventories[this.id].items.push(set[index]);
                        addToCurrentInbox("Took " + set[index].displayName + ".");
                        set.splice(index, 1);
                        foundItemToTake = true;
                        return;
                    }
                });

                if (!foundItemToTake) addToCurrentInbox("Failed to 'take'. Couldn't find " + args[1] + " in entrosets.");

                
            }
            else addToCurrentInbox("Failed to 'take'. Couldn't parse " + args[1]  + ".");
        }
        
    }

    dump(args) {
        const resBit = parseResBit(args[1]);
        const land = this.getLandByPid(this.id);
        if (resBit) {
            // Dump resources
            const inv = this.playerInventories[this.id];
            const available = getInvRes(inv, resBit.resCode);
            if (available < resBit.quantity) {
                addToCurrentInbox(`Only dumped ${available}${resBit.resCode} onto ${land.loc}.`)
                resBit.quantity = available;
            }
            else addToCurrentInbox(`Dumped ${resBit.quantity}${resBit.resCode} onto ${land.loc}.`);
            this.tryChangePlayerResources(inv, resBit.resCode, -resBit.quantity);
            changeLandResources(land, resBit.resCode, resBit.quantity);
        }
        else if (tech.find(it => it.craftName == args[1])) {
            // Dump item 
            const inv = this.playerInventories[this.id];
            let index = -1;
            for (let i = 0; i < inv.items.length; i++) {
                const it = inv.items[i];
                if (it.craftName == args[1]) {
                    index = i;
                    break;
                }
            }

            if (index < 0) {
                addToCurrentInbox("You can't dump " + args[1] + ". You don't have one on you.");
                return;
            }

             // Do the dump!
            inv.items.splice(index, 1);
            addToCurrentInbox(`You dumped a ${args[1]}.`);
        }
        else addToCurrentInbox("Failed to 'dump'. Couldn't parse " + args[1] + ".");
    }

    abandon(args) {
        const coord = parseChessNotation(args[1], this.mapSize, true);
        if (coord.valid) {
            const land = this.getLandAtPos([coord.x, coord.y]);
            if (land) {
                if (land.owner == this.id) {
                    removeFromArr(this.playerLands[this.id], land);
                    land.abandoned;
                    addToCurrentInbox("Land at " + args[1] + " will be abandoned. Its LVT is still due for this season, but then ownership is lost and you will not owe LVT for it.");
                }
                else addToCurrentInbox("Couldn't find land you own at " + args[1] + ".");
            }
            else addToCurrentInbox("Couldn't find land at " + args[1] + "?");
        }
        else {
            addToCurrentInbox(coord.warning);
        }
    }

    ready(args, force) {
        if (this.metaPlans[this.id].ready && !force) {
            addToCurrentInbox("You are now even more ready.");
            return;
        }
            
        this.metaPlans[this.id].ready = true;

        if (force) {
            addToCurrentInbox("Force day forward...");
            this.metaPlans.forEach(metaPlan => {
                metaPlan.ready = true;
            });
        }

        let everyonesReady = true;
        this.metaPlans.forEach(metaPlan => {
            if (!metaPlan.ready) everyonesReady = false;
        });

        if (!everyonesReady) {
            const playerName = this.playerNames[this.id];
            for (let i = 0; i < this.playerNames.length; i++) {
                if (i != this.id) {
                    if (this.metaPlans[i].ready) this.messagePidImmediately(i, `${playerName} is ready for the day. You are ready with them.`);
                    else this.messagePidImmediately(i, `${playerName} is ready for the day. You are not ready.`);
                }
            }

            this.viewPlayers(this.id);
            addToCurrentInbox("You indicated you are ready for the day.");
            return;
        }

        readCurrentInboxMail();
        messageAllPlayersImmediately("Everyone is ready for the day.");
        this.dayClock = this.secondsPerDay * 1000;
        georgeDay();
    }

    plans(args) {
        let plans = this.playerPlans[this.id];

        // Checking plans
        addToCurrentInbox("");
        this.checkTime();

        if (plans.length == 0) {
            addToCurrentInbox("You haven't made any plans today. Try 'gather w'.");
        }
        addToCurrentInbox(`Plans for ${this.playerNames[this.id]}:`);
        const hoverboards = this.playerInventories[this.id].items.filter(it => it.craftName == 'hoverboard' && it.hp > 0).length;
        if (hoverboards > 0) addToCurrentInbox(`hoverboards: ${hoverboards.length}:`);
        const jumps = this.playerInventories[this.id].items.filter(it => it.craftName == 'jumpoline' && it.hp > 0).length;
        if (jumps > 0) addToCurrentInbox(`Jumpolines: ${jumps.length}:`);

        // Function to format a single entry
        function formatEntry(action, description, value) {
            // Adjust the length for action and description columns
            const actionWidth = 10;
            const descriptionWidth = 30;
        
            // Format the entry with padding
            return `${action.padEnd(actionWidth)} ${description.padEnd(descriptionWidth)} ${value.toString().padStart(4)}`;
        }
        
        let i = 1;
        this.playerPlans[this.id].forEach(plan => {
            let costStr = plan.cost < 0 ? '?' : plan.cost;
            addToCurrentInbox(`${i}. ` + formatEntry(plan.title, plan.details, costStr));
            i++;
        });


        let totalCost = 0;
        for (let i = 0; i < plans.length; i++) {
            if (plans[i].cost > 0) totalCost += plans[i].cost;
        }
        let energyRemaining = this.playerEnergies[this.id] - totalCost;

        let costStr = totalCost.toString();
        let remainingStr = energyRemaining.toString();
        let unknownEnergy = this.metaPlans[this.id].unknownEnergies > 0;
        if (unknownEnergy) {
            costStr += '?';
            remainingStr += '?';
        }
        addToCurrentInbox("________________________________________________________");
        addToCurrentInbox("Estimated Total Cost:".padEnd(45) + `${costStr.padStart(4)}`);
        addToCurrentInbox("Estimated Remaining:".padEnd(45) + `${remainingStr.padStart(4)}\n`);
        if (unknownEnergy) addToCurrentInbox("One or more of your plans has an unknown energy cost.");
        if (energyRemaining < 0) addToCurrentInbox("(You may run out of energy and not complete your plans.)");
        if (this.dayCount < this.taxSeason) addToCurrentInbox(`(Note you'll gain ${this.energyPerDay}e by default when you sleep on unowned land.)\n`);

        addToCurrentInbox("");
    }

    estimateRemainingEnergy(pid) {

        const inv = this.playerInventories[pid];
        if (!inv) {
            logWarning("bad pid or something: " + pid);
            return;
        }

        let hoverboards = inv.items.filter(it => it.craftName == hoverboardName).length;
        let jumps = inv.items.filter(it => it.craftName == jumpName).length;
        let hammers = inv.items.filter(it => it.craftName == hammerName).length;
        let total = 0;
        this.playerPlans[pid].forEach(plan => {
            if (plan.cost < 0) {
                // Skip
            }
            else if (plan.title == move_title) {
                if (plan.terrain == mountainTerrain) {
                    if (jumps > 0) jumps--;
                    else total += mountainCost;
                } 
                else if (hoverboards > 0) {
                    hoverboards--;
                    total += Math.round(getTerrainMovementCost(plan.terrain) / 2);
                }
                else total += getTerrainMovementCost(plan.terrain);
            }
            else if (plan.title == craft_title) {
                total += Math.max(0, craftCost - (Math.min(hammers, 2) * whammerReduction));
            }
            else total += plan.cost;
        });

        if (this.metaPlans[pid].unknownEnergies > 0) return `${this.playerEnergies[pid] - total}e?`;
        else return `${this.playerEnergies[pid] - total}e`;
    }

    addPlanByPid(pid, pn) {
        let plans = this.playerPlans[pid];
        if (plans.length > 99) {
            addToCurrentInbox("Can't make more than 100 plans");
            return false;
        }

        plans.push(pn);
        const costStr = pn.cost < 0 ? '?' : pn.cost;
        addToCurrentInbox(`Made plan to ${pn.title.substring(0, pn.title.length - 1).toLowerCase()} ${pn.details} costing ${costStr}e. Estimated remaining energy is ${this.estimateRemainingEnergy(pid)}.`);
        if (this.dayCount < this.taxSeason) addToCurrentInbox(`(Use 'plans' to view plans and see energy balance.)`);
        return true;
    }

    cancelPlans(args) {
        let plans = this.playerPlans[this.id];
        let metaPlans = this.metaPlans[this.id];
        if (args.length > 1) {
            if (args[1] == 'all') {
                metaPlans.unknownEnergies = 0;
                this.playerPlans[this.id] = [];
                this.playerPlannedPositions[this.id] = this.playerPositions[this.id];
                addToCurrentInbox("Plans canceled!");
            }
            else addInvalidCurrentInbox(`Did you mean 'cancel all'?`);
        }
        else if (plans.length == 0) {
            addToCurrentInbox("No plans to cancel.");
        }
        else {
            let plan = plans.pop();
            if (plan.title == "Move:") {
                if (plan.cost < 0) metaPlans.unknownEnergies--;
                let plannedPos = this.playerPlannedPositions[this.id];
                plannedPos = [plannedPos[0] - plan.vector[0], plannedPos[1] - plan.vector[1]];
                this.playerPlannedPositions[this.id] = plannedPos;
            }

           addToCurrentInbox(`Canceled last plan.`);
        }
    }

    planMove(args) {
        if (args.length < 2) {
            addToCurrentInbox("Say more. Try 'move <[u]p/[d]own/[l]eft/[r]ight>' or <[n]orth/[s]outh/[e]ast/[w]est.");
            return;
        }

        let metaPlan = this.metaPlans[this.id];

        let dir;
        let description = "";

        const coord = parseChessNotation(args[1], this.mapSize);
        const pos = this.getPos(this.id);
        let plannedPos = this.playerPlannedPositions[this.id];
        if (coord.valid) {
            if (coord.x == plannedPos[0] && coord.y == plannedPos[1]) {
                addToCurrentInbox("Can't move to plot you're already planning to be on.");
                return; ///////////////////////////////////
            }
            dir = [coord.x - pos[0], coord.y - pos[1]];
            if (Math.abs(dir[0]) > 1 || Math.abs(dir[1]) > 1) {
                addToCurrentInbox(`Moves must be scheduled one plot at a time. ${args[1]} is too far away.`);
                return; /////////////////////////////
            }
            if (dir[0] == 0 && dir[1] == 1) {
                description = 'north';
            }
            else if (dir[0] == 0 && dir[1] == -1) {
                description = 'south';
            }
            else if (dir[0] == 1 && dir[1] == 1) {
                description = 'northeast';
            }
            else if (dir[0] == 1 && dir[1] == 0) {
                description = 'east';
            }
            else if (dir[0] == 1 && dir[1] == -1) {
                description = 'southeast';
            }
            else if (dir[0] == -1 && dir[1] == -1) {
                description = 'southwest';
            }
            else if (dir[0] == -1 && dir[1] == 0) {
                description = 'west';
            }
            else if (dir[0] == -1 && dir[1] == 1) {
                description = 'northwest';
            }
            else {
                logWarning("what direction are ya moving: " + dir[0] + "," + dir[1]);
            }
        }
        
        if (!coord.valid) {
            if (['ul', 'upleft', 'nw', 'northwest'].includes(args[1])) {
                description += "northwest";
                dir = [-1, 1];
            }
            else if (['u', 'up', 'n', 'north'].includes(args[1])) {
                description += "north";
                dir = [0, 1];
            }
            else if (['ur', 'upright', 'ne', 'northeast'].includes(args[1])) {
                description += "northeast";
                dir = [1, 1];
            }
            else if (['r', 'right', 'e', 'east'].includes(args[1])) {
                description += "east";
                dir = [1, 0];
            }
            else if (['dr', 'downright', 'se', 'southeast'].includes(args[1])) {
                description += "southeast";
                dir = [1, -1];
            }
            else if (['d', 'down', 's', 'south'].includes(args[1])) {
                description += "south";
                dir = [0, -1];
            }
            else if (['dl', 'downleft', 'sw', 'southwest'].includes(args[1])) {
                description += "southwest";
                dir = [-1, -1];
            }
            else if (['l', 'left', 'w', 'west'].includes(args[1])) {
                description += "west";
                dir = [-1, 0];
            }
            else {
                addToCurrentInbox("Can't parse. Try 'move north' or 'move downleft' or 'move se' or 'move a1'.");
                return;
            }
        }

        plannedPos = [plannedPos[0] + dir[0], plannedPos[1] + dir[1]];
        if (plannedPos[0] < 0 || plannedPos[0] >= this.mapSize[0]) {
            addToCurrentInbox("Can't move off map.");
            return;
        }
        if (plannedPos[1] < 0 || plannedPos[1] >= this.mapSize[1]) {
            addToCurrentInbox("Can't move off map.");
            return;
        }

        let landToEnter = this.map[plannedPos[0]][plannedPos[1]];
        
        this.playerPlannedPositions[this.id] = plannedPos;
        let thisCost = 0;
        let destLoc = vecToLoc(plannedPos);
        switch (landToEnter.terrain) {
            case grassTerrain: // grass
                description += ` ${destLoc}(${grassTerrain})`;
                thisCost = grassCost;
                break;
            case oceanTerrain: // ocean?
                description += ` ${destLoc}(${oceanTerrain})`;
                thisCost = oceanCost;
                break;
            case forestTerrain: // forest
                description += ` ${destLoc}(${forestTerrain})`;
                thisCost = forestCost;
                break;
            case desertTerrain: // desert
                description += ` ${destLoc}(${desertTerrain})`;
                thisCost = desertCost;
                break;
            case mountainTerrain: // mountain
                description += `${destLoc}(${mountainTerrain})`;
                thisCost = mountainCost;
                break;
            default:
                addToCurrentInbox("WARNING: Unhandled terrain " + landToEnter.terrain)
                description += ` along unhandlded${landToEnter.terrain}`;
                thisCost = 50;
                break;
        }

        if (!landToEnter.revealed) {
            metaPlan.unknownEnergies++;
            thisCost = -1;
            description = "into the unknown...";
        }

        let plan = {
            title: move_title, 
            details: description, 
            cost: thisCost,
            destination: plannedPos,
            loc: landToEnter.loc,
            terrain: landToEnter.terrain,
            vector: dir,
        };

        

        this.addPlanByPid(this.id, plan);

        if (this.getPlayerInventoryCount(this.id) > this.getCapacity(this.id)) {
            addToCurrentInbox(`(Heads up: this move may fail since you're currently overburdened, holding: ${this.getPlayerInventoryCount(this.id)}, capacity: ${this.getCapacity(this.id)})`);
        }
        if (landToEnter.terrain == mountainTerrain) {
            if (this.playerInventories[pid].items.find(it => it.craftName == jumpName)) {
                this.addToInbox(this.id, "If you still have a jumpoline at time of move, it will be automatically used and this move cost 0e. The jumpoline will be destroyed.");
            }
        }
        else if (this.playerInventories[pid].items.filter(it => it.craftName == hoverboardName) > 0) {
            this.addToInbox(this.id, "If you still have a hoverboard at time of move, this move will cost half energy. The hoverboard will depreciate.");
        }
    }

    planGather(args) {
        // Didn't specify resource
        if (args.length < 2) {
            addToCurrentInbox(`Specify resource to gather: [t]obbles, [n]up, [w]iggsies, [g]etacles, or [m]oaf.`);
            return;
        }

        const plannedPos = this.playerPlannedPositions[this.id];
        const plannedLand = this.getLandAtPos(plannedPos);
        const plannedLoc = vecToLoc(plannedPos);
        const code = args[1].charAt(0);

        if (plannedLand.owner != this.id && plannedLand.improvements.find(imp => imp.craftName == 'biofence')) {
            const rentAgree = plannedLand.rentalTerms.find(rt => rt.pid == this.id);
            if (rentAgree) {
                addToCurrentInbox(`You have renter's approval to bypass the bio fencing on ${plannedLoc}.`);
            }
            else addToCurrentInbox(`The plot ${plannedLoc} you're gathering on has a biofence, your plan math fail.`);
        }

        const resourceInfo = getResourceInfo(plannedLand, code);
        
        // Specified invalid resource
        if (resourceInfo.name == "") {
            addToCurrentInbox(`The plot ${plannedLoc} doesn't contain a resource for '${code}'. Try 'gather <t/n/w/g/m>'.`);
            if (equalArray(plannedPos, this.getPos(this.id))) addToCurrentInbox("This will execute after you move, so make sure you are looking at the right plot.");
            return;
        }

        // Quantity check
        if (resourceInfo.amount == 0) {
            addToCurrentInbox(`Warning: you're Trying to gather ${resourceInfo.name}, but there isn't any here. Use 'cancel' to undo.`)
        }

        let wantedAmount = getRandomInt(1, 7);
        if (wantedAmount > resourceInfo.amount) wantedAmount = resourceInfo.amount;
        let totalCost = gatherCost;

        let deet = `${resourceInfo.name} at ${plannedLoc}`; 
        let plan = {
            title: "Gather:", 
            details: deet, 
            cost: totalCost,
            amount: wantedAmount,
            location: plannedLoc,
            code: code
        };
        this.addPlanByPid(this.id, plan);
    }

    planCraft(args) {

        if (!this.ongoing) {
            addToCurrentInbox("Game hasn't started, but you can view the craft list.");
            readTechList(null);
            return;
        }
        if (this.id < 0) {
            addToCurrentInbox("You are not in the game, but you can view the craft list.");
            readTechList(null);
            return;
        }

        if (args.length < 2) {
            readTechList(this.playerInventories[this.id]);
        }
        else {

            if (args[1] == '?') {


                if (args.length > 2) {
                    const item = tech.find(it => it.craftName == args[2]);
                    if (item) {
                        this.viewACraft(this.id, item.craftName);
                    }
                    else addToCurrentInbox("Couldn't find item to craft.");
                }
                else addToCurrentInbox("Provide item name you want info about.");
            }
            else if (args[1] == 'lore') {
                const item = tech.find(it => it.craftName == args[1]);
                if (item) addToCurrentInbox(item.lore);
                else addToCurrentInbox("Couldn't find item.");
            }
            else {
                // Plan to craft!
                const craft = tech.find(it => it.craftName == args[1]);
                if (craft) {
                    const plannedLand = this.getLandAtPos(this.playerPlannedPositions[this.id]);
                    if (craft.isLandImprovement) {
                        if (plannedLand.owner != this.id && plannedLand.improvements.find(imp => imp.craftName == "biofence")) {
                            if (plannedLand.rentalTerms.find(rt => rt.pid == this.id)) {
                                addToCurrentInbox(`Your rental access will allow you to bypass the bio fencing at ${plannedLand.loc}.`);
                            }
                            else addToCurrentInbox(`Your plan to craft land improvement on ${plannedLand.loc} may fail due to biofence.`);
                        }
                    }
                    if (craft.craftName == 'biofence') {
                        if (plannedLand.owner != this.id) {
                            addToCurrentInbox(`You cannot craft ${craft.displayName} on ${plannedLand.loc}. Only land owners can build bio fence, regardless of rental status.`);
                            return;
                        }
                    }
                    if (craft.craftName == 'nupnet' && plannedLand.sources.nupfields == 0) {
                        addToCurrentInbox(`There are no nup fields at ${plannedLand.loc}. Did you meant to build a nup net?`);
                    }
                    if (craft.craftName == getagetsName && plannedLand.sources.getnests == 0) {
                        addToCurrentInbox(`There are no getacle nests at ${plannedLand.loc}. Did you meant to build a ${getagetsName}?`);
                    }

                    const craftPlan = {
                        title: "Craft:",
                        details: craft.displayName,
                        cost: craftCost,
                        craftName: args[1],
                        displayName: craft.displayName,
                    }
                    this.addPlanByPid(this.id, craftPlan);
                }
                else addToCurrentInbox("What item do you want to craft??");
            }
        }
    }

    planSeize(args) {
        
        if (args.length < 2) {
            addToCurrentInbox("Type 'seize all' to seize improvements others built on your land. Use 'seize <player name>' to only target one player.");
            return; ////////////
        }
        
        const land = this.getLandAtPos(this.playerPlannedPositions[this.id]);
        let plan = {};
        if (args[1] == 'all') {
            // Seize all
            plan.title = "Seize:";
            plan.details = `all improvements at ${land.loc}`;
            plan.cost = seizureCost;
        }
        else {
            const formattedName = args[1].charAt(0).toUpperCase() + args[1].substring(1);
            const squatterId = this.playerNames.indexOf(formattedName);
            if (squatterId == this.id) {
                addToCurrentInbox("Seizing your own improvements is strictly prohibited.");
                return; //////////////
            }
            else if (squatterId >= 0) {

                const renter = land.rentalTerms.find(r => r.pid == squatterId);
                if (renter) {
                    //#PLURAL
                    addToCurrentInbox(`Cannot seize improvements of a tenant zot. Their rental agreement is for another ${renter.daysLeft} days.`);
                    return; /////////////////////////////////
                }

                plan.title = "Seize:";
                plan.details = `${formattedName}'s improvements at ${land.loc}`;
                plan.cost = seizureCost;
                plan.otherPid = squatterId;
                plan.otherName = formattedName;
            }
            else {
                addToCurrentInbox("Couldn't parse. Who is " + formattedName + "?");
                return; //////////////////////
            }
        }

        if (land.owner != this.id) {
            addToCurrentInbox("Warning: your plan to seize improvements at " + land.loc + " may fail, since you are not the owner.");
        }
        this.addPlanByPid(this.id, plan);
    }

    executeSeize(pn, pid) {
        const land = this.getLandByPid(pid);
        if (land.owner != pid) {
            addToInbox(pid, `Cannot seize. You do not own ${land.loc}.`);
            return; ///////////////
        }

        if (this.playerEnergies[pid] < pn.cost) {
            this.addToInbox(pid, "Too tired. Seizing costs " + pn.cost + "e. You have " + this.playerEnergies[pid] + ".");
            return;
        }


        if (pn.otherPid) {

            if (pn.otherPid == this.id) {
                this.addToInbox(pid, "Your seizure target must have left the game. Seizure failed.");
                return;
            }

            const renter = land.rentalTerms.find(r => r.pid == pid);
            if (renter) {
                //#PLURAL
                addToInboxByPid(`Failed to seize improvements of a tenant zot. Their rental agreement is for another ${renter.daysLeft} days.`);
                return; /////////////////////////////////
            }

            
            const newOtherName = this.playerNames[pn.otherPid]; 
            if (pn.otherName != newOtherName) {
                this.addToInbox(pid, `You targetted ${pn.otherName}. They may have left or they may have changed their name to ${newOtherName}. Seizure will proceed.`);
            }
            
            const imps = land.improvements.filter(imp => imp.owner == pn.otherPid);
            if (imps.length == 0) {
                this.addToInbox(pid, `${newOtherName} has nothing to seize at ${land.loc}.`);
                return;
            }

            imps.forEach(imp => {
                imp.hp -= seizureDepreciation;
                if (imp.hp <= 0) {
                    this.addToInbox(pid, `Seizing ${imp.displayName}. It crumbled.`);
                    this.addToInbox(pn.otherPid, `Your ${imp.displayName} crumbled during seizure by ${this.playerNames[pid]}.`);
                }
                else {
                    this.addToInbox(pid, `Seized ${imp.displayName} (${imp.hp} hp).`);
                    this.addToInbox(pn.otherPid, `Your ${imp.displayName} (${imp.hp} hp) was seized by ${this.playerNames[pid]}.`);
                    imp.owner = pid;
                    this.improvements[pid].push(imp);
                }
            });
        }
        else {

            const imps = land.improvements;
            if (imps.length == 0) {
                this.addToInbox(pid, `No other zots have improvements at ${land.loc}.`);
                return;
            }
            imps.forEach(imp => {
                if (imp.owner == pid) {
                    // No seizing your own improvements, although that would be funny
                }
                else {
                    imp.hp -= seizureDepreciation;
                    if (imp.hp <= 0) {
                        this.addToInbox(pid, `Seizing ${imp.displayName}. It crumbled.`);
                        if (imp.owner >= 0) this.addToInbox(imp.owner, `Your ${imp.displayName} crumbled during seizure by ${this.playerNames[pid]}.`);
                    }
                    else {
                        this.addToInbox(pid, `Seized ${imp.displayName} (${imp.hp} hp).`);
                        if (imp.owner >= 0) this.addToInbox(imp.owner, `Your ${imp.displayName} (${imp.hp} hp) was seized by ${this.playerNames[pid]}.`);
                        imp.owner = pid;
                        this.playerImprovements[pid].push(imp);
                    }
                }
            });
        }

        this.playerEnergies[pid] -= pn.cost;
    }

    isNum(num, min=0, max=Number.MAX_SAFE_INTEGER) {
        return !Number.isNaN(num) && num >= min && num < max;
    }

    justAccept(pid, args) {
        if (args.length < 2) {
            //this.showOffers(this.id);
            this.viewTrades(this.id);
            return;
        }

        let trade;

        const num = parseInt(args[1]);
        if (this.isNum(num, 1, this.tradeOffers.length + 1)) {
            trade = this.tradeOffers[num - 1];
            if (trade.pid == this.id) {
                this.addToInbox(pid, `You can't accept your own trade. If you want to cancel that trade, enter 'offer cancel ${num}'.`);
                return;
            }
            if (!trade.available) {
                this.addToInbox(pid, "Trade " + num + " no longer available.");
                return;
            }
        }
        else {
            const wantedName = args[1].charAt(0) + args[1].substring(1);
            const index = this.playerNames[wantedName];
            if (index < 0) {
                this.addToInbox(pid, `Can't parse trade num or trade partner. Use 'accept <#>' or 'accept <playername>'.`);
                return; ////////////////////////////
            }
            trade = this.tradeOffers.find(trade => trade.pid == index && trade.available);
            if (!trade) {
                this.addToInbox(pid, `No available trade offered by ${wantedName}.`);
                return;//////////////////////////////
            }
        }
        
        let deets = "trade " + num + " from " + this.playerNames[trade.pid];
        let plan = { title: "Accept:", details: deets, cost: tradeCost, offerNum: num };

        this.executeAccept(plan, this.id);

        //this.addPlanByPid(this.id, plan);
    }

    executeAccept(pn, pid) {
        let result = this.checkEnergy(pid, pn.cost);
        if (result.tooTired) {
            this.addToInbox(pid, "Can't accept trade. " + result.msg);
            return;
        }

        // Find offer, see if it's still available
        const trade = this.tradeOffers[pn.offerNum - 1];
        if (!trade) {
            this.addToInbox(pid, "What happened? Couldn't accept trade because couldn't find trade #" + (pn.offerNum - 1) + ".");
            return;
        }
        // Is offerer still around?
        if (!this.playerNames[trade.pid]) {
            this.addToInbox(pid, `Couldn't accept trade ${pn.offerNum}. The player who made the offer has left the game.`);
            return;
        }
        // Is it available?
        if (!trade.available) {
            this.addToInbox(pid, "Couldn't accept trade number " + pn.offerNum + ". It was no longer available.");
            return;
        }
        // Are we within 1 plot?
        if (!within1Move(this.playerPositions[trade.pid], this.playerPositions[this.id])) {
            this.addToInbox(pid, `Couldn't accept, you are at ${vecToLoc(this.playerPositions[this.id])}.`
                                + ` The trade is offered at ${vecToLoc(this.playerPositions[trade.pid])}.`);
            return;
        }


        if (trade.rentOffered) {
            const plot = this.getLandByLoc(trade.rentOffered.loc);
            if (plot.owner != trade.pid) {
                this.addToInbox(pid, `Cannot accept trade, offerer does not own plot ${plot.loc} to rent to you anymore!`);
                return; ///////////////////////
            }
        }


        if (trade.rentWanted) {
            const plot = this.getLandByLoc(trade.rentWanted.loc);
            if (plot.owner != pid) {
                this.addToInbox(pid, `Cannot accept trade, you do not own plot ${plot.loc} to rent it out.`);
                return; ///////////////////////
            }
        }

        // Check if offerer has goods
        let offerings = '';
        let indexOfOfferedItem = -1;
        if (trade.offeredItem) {
            indexOfOfferedItem = this.playerInventories[trade.pid].items.indexOf(trade.offeredItem);
            if (indexOfOfferedItem < 0) {
                this.addToInbox(pid, `The offer can't be fulfilled by ${this.playerNames[trade.pid]}. They lacked a ${trade.offeredItem} in inventory.`);
                this.addToInbox(trade.pid, `You couldn't fulfill a trade, you didn't have ${trade.offeredItem}.`);
                return;
            }
        }
        const offInv = this.playerInventories[trade.pid];
        for (let i = 0; i < trade.offered.length; i++) {
            const off = trade.offered[i];
            offerings += ` ${off.quantity} ${resCodeToResName.get(off.resCode)}`;
            const resName = resCodeToResName.get(off.resCode);
            if (offInv[resName] < off.quantity) {
                this.addToInbox(pid, `The offer can't be fulfilled by ${this.playerNames[trade.pid]}. They lacked ${off.quantity}${off.resCode}.`);
                this.addToInbox(trade.pid, `You couldn't fulfill a trade, you didn't have ${off.quantity}${off.resCode}.`);
                return; //////////////////////////////
            }
        }


        // Check if accepter has goods
        let wantings = '';
        const accInv = this.playerInventories[pid];
        for (let i = 0; i < trade.wanted.length; i++) {
            const off = trade.wanted[i];
            wantings += ` ${off.quantity} ${resCodeToResName.get(off.resCode)}`;
            const resName = resCodeToResName.get(off.resCode);
            if (accInv[resName] < off.quantity) {
                this.addToInbox(pid, `You can't accept trade ${pn.offerNum}, you lack ${resName}.`);
                return; //////////////////////////////////
            }
        }

        ///////////////////////////////////////////////////
        /////////////////////////////////////////////////// SUCCESS
        ///////////////////////////////////////////////////

        // Message players
        const offerer = this.playerNames[trade.pid];
        const accepter = this.playerNames[pid];
        this.addToInbox(trade.pid, `Your trade was accepted by ${accepter}.`);
        this.addToInbox(pid, `You accepted a trade from ${offerer}.`);


        // Exchange the goods!
        if (trade.offeredItem) {
            this.addToInbox(pid, `Received item: ${trade.offeredItem}(${trade.offeredItem.hp} hp)`);
            this.addToInbox(trade.pid, `Gave item: ${trade.offeredItem}(${trade.offeredItem.hp} hp)`);
            this.playerInventories[pid].items.push(trade.offeredItem);
            this.playerInventories[trade.pid].items.splice(indexOfOfferedItem, 1);
        }

        // Rental rights
        if (trade.rentOffered) {
            // Remember, this.id is accepter, so they're the accepting the landlord's offer
            const plot = this.getLandByLoc(trade.rentOffered.loc);
            const rentalTerm = plot.rentalTerms.find(rt => rt.pid == this.id);
            if (rentalTerm) {
                this.addToInbox(pid, `Your rent for ${plot.loc} was extended for ${trade.rentOffered.daysLeft} days. Rental agreements ends in ${rentalTerm.daysLeft} days.`);
                this.addToInbox(trade.pid, `Extended rent for ${plot.loc} to ${this.playerNames[this.id]} for ${trade.rentOffered.daysLeft} days. Rental agreement ends in ${rentalTerm.daysLeft} days.`);
            }
            else {
                plot.rentalTerms.push({ pid: this.id, daysLeft: trade.rentOffered.daysLeft });
                this.addToInbox(pid, `${this.playerNames[trade.pid]} agreed to rent ${plot.loc} to you for ${trade.rentOffered.daysLeft} days.`);
                this.addToInbox(trade.pid, `You agreed to rent ${plot.loc} to ${this.playerNames[this.id]} for ${trade.rentOffered.daysLeft} days.`);
            }
        }

        if (trade.rentWanted) {
            // Remember, this.id is the accepter, so we're the landord and found a renter
            const plot = this.getLandByLoc(trade.rentWanted.loc);
            const ourRental = plot.rentalTerms.find(rt => rt.pid == trade.pid);
            if (ourRental) {
                ourRental.daysLeft += trade.rentWanted.daysLeft;
                this.addToInbox(pid, `Extended rent for ${plot.loc} to ${this.playerNames[this.id]} for ${trade.rentWanted.daysLeft} days. Rental agreement ends in ${ourRental.daysLeft} days.`);
                this.addToInbox(trade.pid, `Your rent for ${plot.loc} was extended for ${trade.rentWanted.daysLeft} days. Rental agreement ends in ${ourRental.daysLeft} days.`);
            }
            else {
                plot.rentalTerms.push({ pid: trade.pid, daysLeft: trade.rentWanted.daysLeft });
                if (plot.rentalTerms.find(rt => rt.pid == trade.pid)) logDEBUG("found the new agreement!!!");
                this.addToInbox(pid, `You agreed to rent ${plot.loc} to ${this.playerNames[this.id]} for ${trade.rentWanted.daysLeft} days.`);
                this.addToInbox(trade.pid, `${this.playerNames[trade.pid]} agreed to rent ${plot.loc} to you for ${trade.rentWanted.daysLeft} days.`);
            }
        }

        // Resources
        for (let i = 0; i < trade.offered.length; i++) {
            const off = trade.offered[i];
            this.tryChangePlayerResources(offInv, off.resCode, -off.quantity);
            this.tryChangePlayerResources(accInv, off.resCode, off.quantity);
        }
        for (let i = 0; i < trade.wanted.length; i++) {
            const off = trade.wanted[i];
            this.tryChangePlayerResources(offInv, off.resCode, off.quantity);
            this.tryChangePlayerResources(accInv, off.resCode, -off.quantity);
        }
        if (offerings.length > 0) {
            this.addToInbox(trade.pid, `You gave: ${offerings}.`);
            this.addToInbox(pid, `You received: ${offerings}.`);
        }
        if (wantings.length > 0) {
            this.addToInbox(trade.pid, `You received: ${wantings}.`);
            this.addToInbox(pid, `You gave: ${wantings}.`);
        }

        // Charge energy to accepter
        this.playerEnergies[pid] -= pn.cost;
        trade.available = false;
    }

    planAttack(args) {
        addToCurrentInbox("Why would you want to attack?");
    }

    checkEnergy(pid, cost) {
        let result = { msg: '', tooTired: false};
        let energy = this.playerEnergies[pid];
        if (energy < cost) {
            result.msg = `Too tired. You have ${energy} energy. This requires ${cost} energy.`;
            result.tooTired = true;
        }
        return result;
    }

    postOffer(pid, args) {
        if (args.length == 1) {
            this.viewTrades(this.id);
            return;
        }

        let oldTrade = this.tradeOffers.find(t => t.pid == pid);
        let indexOfOldTrade = this.tradeOffers.indexOf(oldTrade);

        if (args.length > 1 && args[1] == 'cancel') {

            if (args.length > 2) {
                const tradeNum = args[2];
                if (!this.isNum(tradeNum, 1, this.tradeOffers.length + 1)) {
                    this.addToInbox(pid, "Can't cancel trade. Couldn't find trade with num: " + args[2] + ".");
                    return;
                }
                const tradeIndex = tradeNum - 1;
                oldTrade = this.tradeOffers[tradeIndex];
                if (oldTrade.pid != this.id) this.addToInbox(pid, "Can't cancel a trade you didn't make.");
                else if (oldTrade.available) {
                    oldTrade.available = false;

                    // #TODO make this print nicely
                    //let tradeString = getTradeString(trade);
                    this.addToInbox(pid, `You canceled your trade.`); //offering ${trade.offered} for ${trade.wanted}.`);
                }
                else this.addToInbox(pid, `Trade no longer available anyway.`);
            }
            else {
                oldTrade.available = false;
                this.addToInbox(pid, `Canceled your trade offer.`);
            }


            return; ///////////////////////////////////////////
        }


        const check = this.checkEnergy(this.id, tradeCost);
        if (check.tooTired) {
            this.addToInbox(pid, check.msg);
            return;
        }

        if (args.length < 4) {
            this.addToInbox(pid, `Invalid offer format. Need at least one offered asset separated by '${this.separator}' from wanted asset.`);
            return;
        }

        let separatorIndex = -1;
        for (let i = 0; i < args.length; i++) {
            if (args[i] == this.separator) {
                separatorIndex = i;
                break;
            }
        }

        if (separatorIndex < 0) {
            this.addToInbox(pid, `Invalid offer format. No '${this.separator}' found.`);
            return;
        }

        let offeredArgs = [];
        let wantedArgs = [];
        // Start at 1, since arg[0]=='offer'
        for (let i = 1; i < separatorIndex; i++) {
            offeredArgs.push(args[i]);
        }
        for (let i = separatorIndex + 1; i < args.length; i++) {
            wantedArgs.push(args[i]);
        }
        if (offeredArgs.length == 0 || wantedArgs.length == 0) {
            this.addToInbox(pid, `Invalid offer format. At least 1 asset must be offered and 1 wanted. If you want to give assets or take assets, use '0t' for that element.`);
            return;
        }

        

        ///////////////////////// maybe we're close to a correctly formatted trade!
        /////////////// do we check right now for existence of resources? probably should.
        /// hold off on player-specific or repeatables

        let msgOffer = `${this.playerNames[this.id]} is offering`;
        let msgWant = ` for`;
        let trade = {pid: this.id, available: true, rentOffered: null, rentWanted: null, itemOffered: null, offered: [], wanted: [], playersAllowed: [], dayOffered: this.dayCount};
        let offerCount = 0;
        let wantedCount = 0;

        trade.itemOffered = this.playerInventories[this.id].items.find(it => it.craftName == offeredArgs[0]);
        if (trade.itemOffered) {
            msgOffer += ` ${trade.itemOffered}(${trade.itemOffered.hp} hp)`;
            offerCount++;
        }

        if (offeredArgs[0] == 'rent') {
            const coord = parseChessNotation(offeredArgs[1], this.mapSize);
            if (!coord.valid) {
                this.addToInbox(pid, `Invalid rental term '${offeredArgs[1]}'. Example 'rent a3 3 for 20w'. This offers rent for a3 for 3 days in exchange for 20 wiggsies.`);
                return; ////////////////////
            }
            const plot = this.getLandAtPos([coord.x, coord.y]);
            if (plot.owner != trade.pid) {
                this.addToInbox(pid, `Cannot offer rent on plot you do not own: ${plot.loc}.`);
                return; ///////////////////
            }
            const numOfDays = parseInt(offeredArgs[2]);
            if (!this.isNum(numOfDays, 1)) {
                this.addToInbox(pid, `Invalid rental term '${offeredArgs[2]}'. Example 'rent a3 3 for 20w'. This offers rent for a3 for 3 days in exchange for 20 wiggsies.`);
                return; ////////////////////
            }

            trade.rentOffered = { loc: plot.loc, daysLeft: numOfDays };
            offeredArgs.splice(0, 3);
            msgOffer += ` (rent at ${plot.loc} for ${numOfDays} days)`;
            offerCount++;
        }

        if (wantedArgs[0] == 'rent') {

            const coord = parseChessNotation(wantedArgs[1], this.mapSize);
            if (!coord.valid) {
                this.addToInbox(pid, `Invalid rental term '${wantedArgs[1]}'. Example 'rent a3 3 for 20w'. This offers rent for a3 for 3 days in exchange for 20 wiggsies.`);
                return; ////////////////////
            }
            const plot = this.getLandAtPos([coord.x, coord.y]);
            if (plot.owner == trade.pid) {
                this.addToInbox(pid, `Cannot want rent on plot you already own at ${plot.loc}. Did you mean to offer rent? Try 'offer rent ${plot.loc} <# days> for ...`);
                return; ///////////////////
            }
            const numOfDays = parseInt(wantedArgs[2]);
            if (!this.isNum(numOfDays, 1)) {
                this.addToInbox(pid, `Invalid rental term '${wantedArgs[2]}'. Example 'rent a3 3 for 20w'. This offers rent for a3 for 3 days in exchange for 20 wiggsies.`);
                return; ////////////////////
            }

            trade.rentWanted = { loc: plot.loc, daysLeft: numOfDays };
            wantedArgs.splice(0, 3);
            msgWant += ` (rent at ${plot.loc} for ${numOfDays} days)`;
            wantedCount++;
        }


        let offeredElements = [];
        for (let i = 0; i < offeredArgs.length; i++) {
            let resBit = parseResBit(offeredArgs[i]);
            if (!resBit) {
                this.addToInbox(pid, "Can't parse '" + offeredArgs[i] + "'. Examples of valid args: '12t', '1n, '300w', '0g', '1m'.");
                return;
            }

            // Check for resource already being offered
            let existingElement = offeredElements.find(el => el.resCode === resBit.resCode);
            if (existingElement) existingElement.quantity += resBit.quantity;
            else offeredElements.push({resCode: resBit.resCode, quantity: resBit.quantity});
        }

        offeredElements.forEach(el => {
            if (offerCount > 0) msgOffer += ',';
            msgOffer += ` ${el.quantity} ${resCodeToResName.get(el.resCode)}`;
            trade.offered.push({quantity: el.quantity, resCode: el.resCode});
            offerCount++;
        });
        
        let wantedElements = [];
        for (let i = 0; i < wantedArgs.length; i++) {
            const arg = wantedArgs[i];

            const firstChars = arg.substring(0, arg.length - 1);
            const lastChar = arg.charAt(arg.length - 1);
            const num = parseInt(firstChars);
            if (!this.isNum(num)) {
                this.addToInbox(pid, "Can't parse '" + firstChars + "'. Examples of valid args: '12t', '1w, '0m'.");
                return; ////////////////////////
            }
            if (!resCodes.includes(lastChar)) {
                this.addToInbox(pid, `Can't parse '${lastChar}'. Valid resource codes are ${resCodes}.`);
                return; ////////////////////////
            }

            // Check for resource already being offered
            let existingElement = wantedElements.find(el => el.lastChar === lastChar);
            if (existingElement) existingElement.num += num;
            else wantedElements.push({lastChar, num});
            
        }

        wantedElements.forEach(el => {
            if (wantedCount > 0) msgWant += ',';
            msgWant += ` ${el.num} ${resCodeToResName.get(el.lastChar)}`;
            trade.wanted.push({quantity: el.num, resCode: el.lastChar});
            wantedCount++;
        });

        if (oldTrade) {
            oldTrade.available = false;
            this.addToInbox(this.id, `Your previous offer, trade ${indexOfOldTrade + 1}, has been taken down.`);
        }

        const fullMsg = msgOffer + msgWant;
        logDEBUG("trade.pid: " + trade.pid);
        logDEBUG("trade.fullMsg: " + fullMsg);

        this.playerEnergies[this.id] -= tradeCost;
        this.tradeOffers.push(trade);
        messageAllPlayersImmediately(fullMsg);
    }

    bid(args) {
        if (args.length < 2) {
            //addToCurrentInbox(this.getAuctions(this.id));
            this.viewAuctions(this.id);
            return;
        }
        if (args.length < 3) {
            this.messagePidImmediately(this.id, "Improper bid format. Try 'bid a9 4'.");
            return;
        }

        const coord = parseChessNotation(args[1], this.mapSize);
        if (!coord.valid) {
            this.messagePidImmediately(this.id, "Improper bid format. What plot is '" + args[1] + "'?");
            return;
        }
        
        const amount = parseInt(args[2]);
        if (Number.isNaN(amount) || amount < 0) {
            this.messagePidImmediately(this.id, "Improper bid format. Must be whole number greater than or equal to 0.");
            return;
        }

        if (this.playerInventories[this.id].debt > 0) {
            this.messagePidImmediately(this.id, `Cannot bid on land when you are in debt! You owe ${this.playerInventories[this.id]} resources to the zoot. Use 'land' to pay your land tax or go gather resources.`);
            return; ////////////////////
        }

        const pid = this.id;
        const land = this.getLandAtPos([coord.x, coord.y]);
        const auction = this.seasonAuctions.find((a) => a.loc == land.loc);
        if (auction) {
            let bidPreviously = false;
            for (let i = 0; i < auction.bids.length; i++) {
                const bid = auction.bids[i];
                if (bid.pid == pid) {
                    bidPreviously = true;
                    auction.bids[i] = { pid: pid, amt: amount };
                    addToCurrentInbox(`You changed your bid to ${amount} resources at ${land.loc}.`);
                    break;
                }
            }

            if (!bidPreviously) {
                // First bid, energy check!
                const result = this.checkEnergy(pid, bidCost);
                if (result.tooTired) {
                    addToCurrentInbox(`Too tired to bid. Bid cost is ${bidCost}e.`);
                    return; ///////////////////////
                }

                this.playerEnergies[pid] -= bidCost;
                auction.bids.push({pid: pid, amt: amount});
                addToCurrentInbox(`You submitted a sealed bid of ${amount} resources at ${land.loc}.`);
            }
        }
        else {

            // First bid, energy check!
            const result = this.checkEnergy(pid, bidCost);
            if (result.tooTired) {
                addToCurrentInbox(`Too tired to start bidding. Bid cost is ${bidCost}e.`);
                return; ///////////////////////
            }
            this.playerEnergies[pid] -= bidCost;

            const newAuction = {
                land: land,
                loc: land.loc,
                pos: land.pos,
                bids: [{pid: pid, amt: amount}],
            }
            this.seasonAuctions.push(newAuction);
            this.addToInbox(pid, `You started an auction at ${land.loc} with a bid of ${amount}.`);
            if (land.owner != pid && land.owner >= 0) {
                newAuction.bids.push({pid: land.owner, amt: land.ownerLastBid});
                addToCurrentInbox(`The owner automatically bids their last bid.`
                                    + ` This will be greater than or equal to ${land.lvt}.`
                                    + ` The owner may override it.`);
            }
            let terr = '?';
            if (land.revealed) terr = land.terrain;
            let info = `('${terr}' `;
            if (land.owner < 0) info += "unowned)";
            else info += ` owned by ${this.playerNames[land.owner]})`;

            messageAllPlayersImmediately(`An auction was started for ${land.loc}${info}. Auction will resolve in ${this.getDaysLeft()} days, when season ends.`);
        }
    }

    getLandByPid(pid) {
        if (Number.isNaN(pid)) {
            logWarning("null pid: " + pid);
            return;
        }
        if (pid < 0 || pid >= this.playerPositions.length) {
            logWarning("oob pid: " + pid);
            return;
        }
        let pos = this.playerPositions[pid];
        return this.map[pos[0]][pos[1]];
    }

    getLandAtPos(pos, doWarnings=true) {
        if (!pos) {
            if (doWarnings) logWarning("no pos provided!");
            return null;
        }
        if (pos[0] < 0 || pos[0] >= this.mapSize[0]) {
            if (doWarnings) logWarning("oob x! " + pos[0]);
            return null;
        }
        if (pos[1] < 0 || pos[1] >= this.mapSize[1]) {
            if (doWarnings) logWarning("oob y! " + pos[1]);
            return null;
        }
        return this.map[pos[0]][pos[1]];
    }

    getLandByLoc(loc) {
        const coord = parseChessNotation(loc, this.mapSize);
        if (coord.valid) return this.getLandAtPos([coord.x, coord.y]);
    }

    getPlayerLoc(pid) {
        return vecToLoc(this.playerPositions[pid]);
    }

    getPos(pid) {
        return this.playerPositions[pid];
    }

    getCapacity(pid) {
        let capacity = 50;
        const arms = this.playerInventories[pid].items.filter(it => it.craftName == 'extraarm');
        const thirdArms = this.playerInventories[pid].items.filter(it => it.craftName == 'thirdarm');
        const bags = this.playerInventories[pid].items.filter(it => it.craftName == 'backbag');
        capacity += arms.length * capacityPerArm + bags.length * backbagCapacity + thirdArms.length * capacityPerArm;
        capacity -= this.playerInjuries[pid] * injuryCapReduction;
        if (capacity < 0) capacity = 0;
        return capacity;
    }

    getMaxEnergy(pid) {
        const lungs = this.playerInventories[pid].items.filter(it => it.craftName == 'extralung');
        const thirdLungs = this.playerInventories[pid].items.filter(it => it.craftName == 'thirdlung');
        return this.startingMaxEnergy + lungs.length * energyPerLung + thirdLungs.length * energyPerLung;
    }

    // Technically now the same as resources count
    getPlayerInventoryCount(pid) {
        let inventory = this.playerInventories[pid];
        let amount = inventory.tobbles 
            + inventory.nup
            + inventory.wiggsies 
            + inventory.getacles 
            + inventory.moaf; 
            //+ inventory.items.length;
        return amount;
    }

    getPlayerLVT(pid) {
        const lands = this.playerLands[pid];
        let lvt = 0;
        lands.forEach(land => {
            lvt += land.lvt;
        });
        return lvt;
    }
    
    getResourcesCount(pid) {
        let inventory = this.playerInventories[pid];
        let amount = inventory.tobbles 
            + inventory.nup
            + inventory.wiggsies 
            + inventory.getacles 
            + inventory.moaf; 
        return amount;
    }

    getClosetedResourcesCount(pid) {
        const imps = this.playerImprovements[pid];
        let amount = 0;
        imps.forEach(imp => {
            if (imp.craftName == 'ploset') {
                let inventory = imp.inventory;
                amount += inventory.tobbles 
                    + inventory.nup
                    + inventory.wiggsies 
                    + inventory.getacles 
                    + inventory.moaf; 
            }
        });
        return amount;
    }

    lands(args) {
        if (args.length < 2) {
            // Print tax bill: land, lvt, current date, next lvt payment due date
            // Also account, and your resources
            this.viewLands(this.id);
            return;
        }

        const coord = parseChessNotation(args[1], this.mapSize);
        let resBit = parseResBit(args[1]);

        if (resBit) {
            const tranferAmt = resBit.quantity;
            const resCode = resBit.resCode;

            // Check resources
            const inventory = this.playerInventories[this.id];
            let inInv = 0;
            switch (resCode) {
                case 't':
                    inInv = inventory.tobbles;
                    break;
                case 'n':
                    inInv = inventory.nup;
                    break;
                case 'w':
                    inInv = inventory.wiggsies;
                    break;
                case 'g':
                    inInv = inventory.getacles;
                    break;
                case 'm':
                    inInv = inventory.moaf;
                    break;
            }

            let actualTransferAmt = tranferAmt;
            let didntHaveFullAmountToTransfer = false;
            if (inInv < tranferAmt) {
                actualTransferAmt = inInv;
                if (actualTransferAmt == 0) {
                    addToCurrentInbox(`You aren't holding any ${resCodeToResName.get(resCode)}. Can't transfer ${tranferAmt}${resCode}.`);
                    return; ////////////////////
                }
                else didntHaveFullAmountToTransfer = true;
            }

            const debt = inventory.debt;
            if (debt > 0) {
                if (debt > actualTransferAmt) {
                    this.publicTreasury[resCode] += actualTransferAmt;
                    inventory.debt -= actualTransferAmt;

                    // Ok, progress
                    messageAllPlayersImmediately(`${actualTransferAmt} resources have been collected for ${this.playerNames[this.id]}'s debt. It will be redistributed in the Citizen's Dividend at season's end. ${this.playerNames[this.id]} still owes the zoot ${inventory.debt} resources for unpaid LVT plus fines.`);

                    return; /////////////
                }
                else {
                    this.publicTreasury[resCode] += debt;
                    inventory.debt = 0;
                    actualTransferAmt -= debt;
                    // Hooray
                    messageAllPlayersImmediately(`The remaining ${debt} of ${this.playerNames[this.id]}'s debt has been collected. It will be redistributed in the Citizen's Dividend at season's end. Their zonor is restored!`);
                }
            }


            if (didntHaveFullAmountToTransfer) addToCurrentInbox(`You're only holding ${actualTransferAmt}${resCode}. Only transferred ${actualTransferAmt}${resCode} into your tax account.`);
            else addToCurrentInbox(`Transferred ${actualTransferAmt}${resCode} into your tax account.`);
            this.addToAccount(this.id, resCode, actualTransferAmt);

            this.tryChangePlayerResources(inventory, resCode, -actualTransferAmt);
        }
        else if (coord.valid) {

            // Reordering land
            let lands = this.playerLands[this.id];
            let indexOfLandToMove = -1;
            for (let i = 0; i < lands.length; i++) {
                if (lands[i].pos == [coord.x, coord.y]) {
                    indexOfLandToMove = i;
                    break;
                }
            }

            if (indexOfLandToMove < 0) addToCurrentInbox("Couldn't find " + args[1] + " in lands owned.");
            else {
                let wantedIndex = num;
                if (wantedIndex < 1) wantedIndex = 1;
                else if (wantedIndex > lands.length) wantedIndex = lands.length;

                const landToMove = lands.splice(indexOfLandToMove, 1)[0]; // Cut it out
                lands.splice(wantedIndex, 0, landToMove) // Insert it
                addToCurrentInbox("Reordered land.");
                this.viewLands(this.id);
            }
        }
        else addToCurrentInbox("Invalid input. Try 'land 12n' or 'land g9 3'.")
    }

    getAccountBalance(pid) {
        const account = this.playerAccounts[pid];
        if (account) {
            return account.tobbles + account.nup + account.wiggsies + account.getacles + account.moaf;
        }
        else logWarning("Couldn't find account for " + pid);
        return 0;
    }

    payFromAccount(pid, due) {
        let account = this.playerAccounts[pid];
        let stillDue = due;
        tempLog("pay from account due: " + due);
        if (account) {
            let balance = this.getAccountBalance(pid);
            tempLog("pay from account balance: " + balance);
            while (stillDue > 0 && balance > 0) {
                // put random resource in public treasury
                let paid1 = false;
                let tries = 0;
                while (tries < 99 && !paid1) {
                    const index = getRandomInt(0, 5);
                    switch (index) {
                        case 0:
                            if (account.tobbles > 0) {
                                paid1 = true;
                                this.publicTreasury.t++;
                                account.tobbles--;
                            }
                            break;
                        case 1:
                            if (account.nup > 0) {
                                paid1 = true;
                                this.publicTreasury.n++;
                                account.nup--;
                            }
                            break;
                        case 1:
                            if (account.wiggsies > 0) {
                                paid1 = true;
                                this.publicTreasury.w++;
                                account.wiggsies--;
                            }
                            break;
                        case 0:
                            if (account.getacles > 0) {
                                paid1 = true;
                                this.publicTreasury.g++;
                                account.getacles--;
                            }
                            break;
                            case 0:
                            if (account.moaf > 0) {
                                paid1 = true;
                                this.publicTreasury.m++;
                                account.moaf--;
                            }
                            break;
                    }
                    tries++;
                }

                if (tries > 99) {
                    logWarning("broke out of infinite loop triyng to pay from account");
                }

                // hooray, we paid 1
                balance--;
                stillDue--;

                tempLog("paid 1! balance: " + balance);
                tempLog("actual getbalance: " + this.getAccountBalance(pid));
                tempLog("paid 1! stillDue: " + stillDue);

            }
        }
        else logWarning("Couldn't find account for " + pid);

        return stillDue;
    }

    payFromInventoryRandomly(pid, due) {
        const inventory = this.playerInventories[pid];
        if (inventory) {
            
            let tries = 0;
            let paid1;
            while (due > 0 && this.getPlayerInventoryCount(pid) > 0) {
                paid1 = false;
                const resCode = getRandomElement(resCodes);
                switch (resCode) {
                    case 't':
                        if (inventory.tobbles > 0) {
                            inventory.tobbles--;
                            due--;
                            this.publicTreasury[resCode]++;
                            paid1 = true;
                        }
                        break;
                    case 'n':
                        if (inventory.nup > 0) {
                            inventory.nup--;
                            due--;
                            this.publicTreasury[resCode]++;
                            paid1 = true;
                        }
                        break;
                    case 'w':
                        if (inventory.wiggsies > 0) {
                            inventory.wiggsies--;
                            due--;
                            this.publicTreasury[resCode]++;
                            paid1 = true;
                        }
                        break;
                    case 'g':
                        if (inventory.getacles > 0) {
                            inventory.getacles--;
                            due--;
                            this.publicTreasury[resCode]++;
                            paid1 = true;
                        }
                        break;
                    case 'm':
                        if (inventory.moaf > 0) {
                            inventory.moaf--;
                            due--;
                            this.publicTreasury[resCode]++;
                            paid1 = true;
                        }
                        break;
                }

                tries++;
                if (paid1) tries = 0;
                else if (tries > 99) {
                    logWarning("infinite loop maybe paying from inventory? tries " + tries);
                    break;
                }
            }

        }
        else logWarning("Couldn't find ivnentory for " + pid);

        return due;
    }

    tryChangePlayerResources(inventory, resCode, amount) {

        let resourceChange = amount;
        if (inventory.debt > 0 && amount > 0) {

            const index = this.playerInventories.indexOf(inventory);

            let toPay = amount;
            if (amount > inventory.debt) toPay = inventory.debt;
            this.publicTreasury[resCode] += toPay;
            inventory.debt -= toPay;
            
            if (inventory.debt > 0) {
                messageAllPlayersImmediately(`${toPay} resources have been collected for ${this.playerNames[index]}'s debt. It will be redistributed in the Citizen's Dividend at season's end. ${this.playerNames[index]} still owes the zoot ${inventory.debt} resources for unpaid LVT plus fines.`);
                return;
            }
            else {
                messageAllPlayersImmediately(`The remaining ${toPay} of ${this.playerNames[index]}'s debt has been collected. It will be redistributed in the Citizen's Dividend at season's end. Their zonor is restored!`);
                resourceChange -= toPay;
            }
        }

        changePlayerResources(inventory, resCode, resourceChange);
    }

    addToAccount(pid, resCode, amtToAdd) {
        if (Number.isNaN(amtToAdd) || amtToAdd <= 0) {
            addToCurrentInbox("Couldn't parse " + amtToAdd + ". Nothing deposited.");
            return;
        }
        if (pid < 0 || pid >= this.playerAccounts.length) {
            logWarning("addToAccount: oob pid: " + pid);
            return;
        }
        if (!resCodeToResName.get(resCode)) {
            addToCurrentInbox("Couldn't parse " + resCode + ". Nothing deposited.");
            return;
        }
        const account = this.playerAccounts[pid];
        if (resCode == 't') account.tobbles         += amtToAdd;
        else if (resCode == 'n') account.nup        += amtToAdd;
        else if (resCode == 'w') account.wiggsies   += amtToAdd;
        else if (resCode == 'g') account.getacles   += amtToAdd;
        else if (resCode == 'm') account.moaf       += amtToAdd;
    }

    executeMove(pn, pid) {
        if (this.getPlayerInventoryCount(pid) > this.getCapacity(pid)) {
            this.addToInbox(pid, `Failed to move, holding more than ${this.getCapacity(pid)} things. Try 'drop' or 'craft'.`);
            return;
        }

        const newLand = this.getLandAtPos(pn.destination);

        // In case moving into unrevealed terrain
        switch (newLand.terrain) {
            case grassTerrain: // grass
                pn.cost = grassCost;
                break;
            case oceanTerrain: // ocean?
                pn.cost = oceanCost;
                break;
            case forestTerrain: // forest
                pn.cost = forestCost;
                break;
            case desertTerrain: // desert
                pn.cost = desertCost;
                break;
            case mountainTerrain: // mountain
                pn.cost = mountainCost;
                break;
            default:
                addToInboxByPid("WARNING: Unhandled terrain " + landToEnter.terrain)
                break;
        }

        let isHovering = false;
        let isJumping = false;

        const hoverboard = this.playerInventories[pid].items.find(it => it.craftName == 'hoverboard' && it.hp > 0);
        const jump = this.playerInventories[pid].items.find(it => it.craftName == 'jumpoline' && it.hp > 0);
        
        
        if (newLand.terrain == mountainTerrain) {
            if (jump) {
                isJumping = true;
            }
            else if (hoverboard) {
                this.addToInbox(pid, `Unable to utilize hoverboard on ${mountainTerrain} terrain.`);
            }
        }
        else if (hoverboard) {
            // We can hoverboard!
            isHovering = true;
            pn.cost = Math.floor(pn.cost / 2);
            hoverboard.hp -= hoverboardWear;
            if (hoverboard.hp <= 0) {
                this.addToInbox(pid, `Hovered into ${newLand.loc} (${newLand.terrain})on your hoverboard for half cost (${pn.cost}e). Hoverboard busted!`);
            }
            else this.addToInbox(pid, `Hovered into ${newLand.loc} (${newLand.terrain}) on your hoverboard for half cost (${pn.cost}e). Hoverboard depreciates to ${hoverboard.hp} hp.`);
        }

        if (isJumping) {
            this.addToInbox(pid, `You jumpolined into ${newLand.loc} (${newLand.terrain}) for 0 energy! Jumpoline disintegrates.`);
            jump.hp = 0;
            pn.cost = 0;
        }

        let energy = this.playerEnergies[pid];
        if (energy >= pn.cost) {

            let oldLand = this.getLandByPid(pid);
            removeFromArr(oldLand.playerIds, pid);
            newLand.playerIds.push(pid);

            if (!newLand.revealed) {
                newLand.revealed = true;
                this.playerInventories[pid].exploreStat++;
                messageAllPlayersImmediately(`${this.playerNames[pid]} has explored ${newLand.loc}(${newLand.terrain})!`)
            }

            this.playerPositions[pid] = pn.destination;
            this.playerEnergies[pid] = energy - pn.cost;
            if (!isJumping && !isHovering) this.addToInbox(pid, `You moved to ${newLand.loc}(${newLand.terrain}) for ${pn.cost}.`);
            if (Math.random() > .95) {
                if (isJumping) {
                    this.playerInventories[pid].injuryStat += 3;
                    this.playerInjuries[pid] += 3;
                    this.addToInbox(pid, `Pretty bad jumpoline accident. Triply injury! Carrying capacity reduced to ${this.getCapacity(pid)}.`);
                } 
                else if (isHovering) {
                    this.playerInventories[pid].injuryStat += 2;
                    this.playerInjuries[pid] += 2;
                    this.addToInbox(pid, `You fell off your hoverboard. Double injury! Carrying capacity reduced to ${this.getCapacity(pid)}.`);
                }
                else {
                    this.playerInventories[pid].injuryStat++;
                    this.playerInjuries[pid]++;
                    this.addToInbox(pid, `You moved unsafely and got injured! Carrying capacity reduced to ${this.getCapacity(pid)}.`);
                }
            }
        }
        else {

            if (!newLand.revealed) {
                newLand.revealed = true;
                messageAllPlayersImmediately(`${this.playerNames[pid]} has explored ${newLand.loc}(${newLand.terrain}). It costs ${pn.cost}e to move into ${newLand.terrain}!`)
            }

            this.addToInbox(pid, `Failed to move, not enough energy. Needed ${pn.cost} to move to ${newLand.loc}(${newLand.terrain}).`);
        }
    }

    executeGather(pn, pid) {
        let pos = this.playerPositions[pid];
        let plannedGatherPos = locToVec(pn.location);
        if (!equalArray(pos, plannedGatherPos)) {
            addToInboxByPid("You ended up gathering at a plot you didn't plan on!");
        }

        const land = this.getLandByPid(pid);

        const code = pn.code;
        const resInfo = getResourceInfo(land, code);

        const energy = this.playerEnergies[pid];
        if (energy >= pn.cost) {

            const fence = land.improvements.find(imp => imp.craftName == 'biofence');
            if (pid != land.owner && fence) {

                if (land.rentalTerms.find(r => r.pid == pid)) {
                    addToInboxByPid(`Your rental access allows you to bypass the bio fencing at ${land.loc}.`);
                }
                else {
                    addToInboxByPid(`You failed to gather ${resInfo.name} at ${land.loc}. Did not have access approval for bio fence.`);
                    return; /////////////////////////////
                }
            }

            if (land.owner != pid && land.owner >= 0) {
                if (land.rentalTerms.find(rt => rt.pid == pid)) this.addToInbox(pid, `Your renter, ${this.playerNames[pid]}, gathered ${resInfo.name} on your plot at ${land.loc}.`);
                else this.messagePidImmediately(land.owner, `${this.playerNames[pid]} gathered ${resInfo.name} on your plot at ${land.loc}. To prevent this, build bio fence at ${land.loc}.`);
            }

            if (resInfo.amount > 0) {

                let amountToGather = pn.amount;
                let usedVac = false;
                if (code == 'w') {
                    // Check for wiggyvac
                    const inv = this.playerInventories[pid];
                    const vacs = inv.items.filter(it => it.craftName == 'wiggyvac' && it.hp > 0);
                    for (let i = 0; i < vacs.length; i++) {
                        const vac = vacs[i];
                        vac.hp--;
                        amountToGather += getRandomInt(minGather, maxGather);
                    }
                }

                let usedRod = false;
                if (code == 't') {
                    // Check for gobble rod
                    const rods = this.playerInventories[pid].items.filter(it => it.cratName == rodCraftName && it.hp > 0);
                    for (let i = 0; i < rods.length; i++) {
                        const rod = rods[i];
                        if (rod.craftName == rodCraftName && rod.hp > 0) {
                            rod.hp--;
                            amountToGather += getRandomInt(minGather, maxGather);
                            usedRod = true;
                        }
                    }
                }

                if (amountToGather > resInfo.amount) {
                    amountToGather = resInfo.amount;
                    this.addToInbox(pid, "(Couldn't gather full amount, resources ran dry.)");
                }

                let verb = "gathered";
                if (usedVac) verb = "vacuumed up";
                else if (usedRod) verb = "attracted";
                else this.addToInbox(pid, `You ${verb} ${amountToGather} ${resInfo.name} from ${this.getPlayerLoc(pid)}.`);

                changeLandResources(land, pn.code, -amountToGather);
                this.tryChangePlayerResources(this.playerInventories[pid], pn.code, amountToGather);
                this.playerEnergies[pid] -= pn.cost;

                if (Math.random() > .95) {
                    if (usedRod || usedVac) {
                        this.playerInventories[pid].injuryStat += 2;
                        this.playerInjuries[pid] += 2;
                        this.addToInbox(pid, `You picked up a double injury! Carrying capacity reduced to ${this.getCapacity(pid)}.`);
                    }
                    else {
                        this.playerInventories[pid].injuryStat++;
                        this.playerInjuries[pid]++;
                        this.addToInbox(pid, `You picked up an injury! Carrying capacity reduced to ${this.getCapacity(pid)}.`);
                    }
                }
            }
            else this.addToInbox(pid, "Nothing to gather.");
        }
        else this.addToInbox(pid, "Failed to gather, not enough energy");
    }

    executeCraft(pn, pid) {
        const land = this.getLandByPid(pid);
        const energy = this.playerEnergies[pid];
        const whammers = this.playerInventories[pid].items.filter(it => it.craftName == 'whammer' && it.hp > 0);
        const whammersUsed = Math.min(2, whammers.length);
        const cost = Math.max(0, craftCost - (whammersUsed * whammerReduction));
        if (whammersUsed > 0) {
            this.addToInbox(pid, `Cost to craft was reduced from ${craftCost} to ${cost}.`);
        }

        if (energy >= cost) {

            const foundTech = tech.find(it => it.craftName == pn.craftName);
            if (foundTech && foundTech.isLandImprovement) {

                const fence = land.improvements.find(imp => imp.craftName == 'biofence');
                if (pid != land.owner && fence) {
                    if (land.owner != pid) {
                        if (land.rentalTerms.find(rt => rt.pid == pid)) {
                            addToInboxByPid(`Your rental access allows you to bypass the bio fence at ${land.loc}.`);
                        }
                        else {
                            addToInboxByPid(`You cannot craft ${foundTech.displayName} on bio fenced land at ${land.loc}.`);
                            return; /////////////////////////////
                        }
                    }
                }
                
                
                if (pid != land.owner && foundTech.craftName == 'biofence') {
                    addToInboxByPid(`You failed to craft ${foundTech.displayName} at ${land.loc}. Only the owner, ${this.playerNames[land.owner]}, can build biometric fencing, regardless of rental agreements.`);
                    return; /////////////////////////////
                }


            }

            if (this.tryCraft(pid, pn.craftName, this.playerInventories[pid], land)) {
                if (tech.find(it => it.craftName == pn.craftName).isLandImprovement) {
                    if (whammersUsed) this.addToInbox(pid, `Built ${pn.displayName} on ${land.loc}. Using whammer tech, it cost ${cost} energy.`);
                    else this.addToInbox(pid, `Built ${pn.displayName} on ${land.loc}.`);
                }
                else {
                    if (whammersUsed) this.addToInbox(pid, `Crafted ${pn.displayName}. Using whammer tech, it cost only ${cost} energy.`);
                    else this.addToInbox(pid, `Crafted ${pn.displayName}.`);
                }
                let whammersReduced = 0;
                whammers.forEach(whammer => {
                    whammer.hp -= toolWear;
                    whammersReduced++;
                    if (whammersReduced == whammersUsed) return;
                });
                this.playerEnergies[pid] = energy - cost;
            }
        }
        else this.addToInbox(pid, "Failed to craft, not enough energy");
    }

    tryCraft(pid, craftName, inventory, land) {
        const template = tech.find(it => it.craftName === craftName);
        const techObj = { ...template };
        if (!techObj) {
            this.addToInbox(pid, `Can't craft '${craftName}'. What is that? To list available technologies, enter 'craft'.`);
            return false;
        }
    
        if (techObj.unique) {
            if (inventory.items.find(it  => it.displayName == techObj.displayName)) {
                this.addToInbox(pid,`Can't craft ${techObj.displayName}. You can only have one.`);
                return false;
            }
        }
    
        ////////////////////////////////
        // ok, we're safe!
    
        let lacking = [];
        if (inventory.tobbles  < techObj.tobbles)         lacking.push('tobbles');
        if (inventory.nup      < techObj.nup)             lacking.push('nup');
        if (inventory.wiggsies < techObj.wiggsies)        lacking.push('wiggsies');
        if (inventory.getacles < techObj.getacles)        lacking.push('getacles');
        if (inventory.moaf     < techObj.moaf)            lacking.push('moaf');
    
        let success;
        if (lacking.length == 0) {
    
            success = true;
    
            this.tryChangePlayerResources(inventory, 't', -techObj.tobbles);
            this.tryChangePlayerResources(inventory, 'n', -techObj.nup);
            this.tryChangePlayerResources(inventory, 'w', -techObj.wiggsies);
            this.tryChangePlayerResources(inventory, 'g', -techObj.getacles);
            this.tryChangePlayerResources(inventory, 'm', -techObj.moaf);
    
            techObj.hp++; // To make up for the fact that crafting comes immediately before depreciation
            if (techObj.isLandImprovement) {
                techObj.owner = pid;
                techObj.loc = land.loc;

                if (techObj.craftName == 'biofence') {
                    const oldFence = this.playerImprovements[pid].find(imp => imp.craftName == 'biofence');
                    if (oldFence) {
                        removeFromArr(this.playerImprovements[pid], oldFence);
                        removeFromArr(land.improvements, oldFence);
                        this.addToInbox(pid, "Old biometric fencing was replaced.");
                    }
                }

                if (land.owner != pid && land.owner >= 0) {
                    if (land.rentalTerms.find(rt => rt.pid == pid)) this.addToInbox(pid, `Your renter, ${this.playerNames[pid]}, built ${techObj.displayName} on your plot at ${land.loc}.`);
                    else this.messagePidImmediately(land.owner, `${this.playerNames[pid]} built ${techObj.displayName} on your plot at ${land.loc}. To prevent this, build bio fence at ${land.loc}. You may move to this plot and 'seize' the ${techObj.displayName}.`);
                }

                this.playerImprovements[pid].push(techObj);
                land.improvements.push(techObj);
            }
            else inventory.items.push(techObj);
        }
        else {
    
            success = false;
    
            let str = 'You lacked ';
            if (lacking.length > 2) {
                for (let i = 0; i < lacking.length - 1; i++) {
                    const element = lacking[i];
                    str += element + ", ";
                }
                str += `and ${lacking[lacking.length - 1]}.`;
            }
            else if (lacking.length == 2) {
                str += `${lacking[0]} and ${lacking[1]}.`;
            }
            else str += `${lacking[lacking.length - 1]}.`;
            this.addToInbox(pid,`${str} You did not craft ${techObj.displayName}.`);
        }
    
        return success;
    }

    

    // Communications: speak or shout
    speak(args, shouting) {

        logWarning("SPEAK! " + this.playerInventories[this.id].chatStat);

        const cost = shouting ? shoutCost : speakCost;
        const verb = shouting ? 'shout' : 'speak';

        let msg = args[1];
        if (args.length < 2) {
            if (shouting) addToCurrentInbox("You shouted, but nothing came out. You did not lose energy. Enter '? speak' for more details.");
            else addToCurrentInbox("Did you say something? Enter '? speak' for more details.");
            return;
        }

        if (!this.ongoing) {

            // Peeking
            if (this.id >= 0) {
                if (this.playerNames.length == 1) {
                    addToCurrentInbox(`You ${verb} to no one. You're the only player signed up. Since game hasn't started, there's no energy cost.`);
                }
                else {
                    addToCurrentInbox(`You ${verb} all players in the lobby. Since game hasn't started, there's no energy cost.`);
                    let truncated = this.playerNames[this.id] + (shouting ? " shouts: " : " says: ");
                    truncated += msg.substring(0, this.maxSpeakingLength);
                    for (let i = 0; i < this.playerNames.length; i++) {
                        if (i != this.id) this.messagePidImmediately(i, truncated);
                    }
                }
            }
            else {
                addToCurrentInbox("You cannot 'speak' or 'shout' until you've joined the game by using 'join <player name>'.");
            }
            return;
        }

        const land = this.getLandByPid(this.id);
        if (shouting && this.playerNames.length < 2) {
            addToCurrentInbox (`...There are no other zots to shout to.`);
            return;
        }


        let energy = this.playerEnergies[this.id];
        if (energy < cost) {
            addToCurrentInbox(`It takes ${cost} to ${verb}. You have ${this.playerEnergies[this.id]}. Too tired.`);
            return;
        }

        for (let i = 2; i < args.length; i++) {
            msg += ` ${args[i]}`;
        }

        if (msg.length > this.maxSpeakingLength) {
            let truncated = msg.substring(0, this.maxSpeakingLength);
            addToCurrentInbox(`Your message length is ${msg.length}. Max size is ${this.maxSpeakingLength}. This would fit: ${truncated}`);
            return;
        }

        /////////////////////////////// SUCCESS JEEZ ///////////////

        const speaker = this.playerNames[this.id];
        const pastTense = shouting ? 'shouted' : 'spoken';

        

        let nearbyZots = [];
        let recipients = 'all zots';
        if (!shouting) {

            let nearbyLands = [];
            const pos = this.playerPositions[this.id];
            nearbyLands.push(this.getLandAtPos(vAdd(pos, [0,0])));
            nearbyLands.push(this.getLandAtPos(vAdd(pos, [0,1])));
            nearbyLands.push(this.getLandAtPos(vAdd(pos, [0,-1])));
            nearbyLands.push(this.getLandAtPos(vAdd(pos, [1,0])));
            nearbyLands.push(this.getLandAtPos(vAdd(pos, [1,1])));
            nearbyLands.push(this.getLandAtPos(vAdd(pos, [1,-1])));
            nearbyLands.push(this.getLandAtPos(vAdd(pos, [-1,0])));
            nearbyLands.push(this.getLandAtPos(vAdd(pos, [-1,1])));
            nearbyLands.push(this.getLandAtPos(vAdd(pos, [-1,-1])));
            nearbyLands.forEach(land => {
                if (land) {
                    land.playerIds.forEach(id => {
                        if (this.id != id) nearbyZots.push(id);
                    });
                }
            });

            if (nearbyZots.Length == 1) {
                recipients = this.playerNames[nearbyZots[0]];
            }
            else if (nearbyZots.length == 2) {
                recipients = this.playerNames[nearbyZots[0]] + " and " + this.playerNames[nearbyZots[1]];
            }
            else {
                for (let i = 0; i < nearbyZots.length - 1; i++) {
                    recipients += this.playerNames[nearbyZots[i]] + ", ";
                }
                recipients += "and " + this.playerNames[nearbyZots[nearbyZots.length - 1]]; 
            }
        }

        if (shouting) {
            messageAllPlayersImmediately(`At ${land.loc}, ${speaker} has ${pastTense}:\n\n${msg}\n`);
            addToCurrentInbox(`You shouted to all zots for ${shoutCost} energy (${this.playerEnergies[this.id]}e left).`);
        }
        else {
            if (nearbyZots.length == 0) {
                addToCurrentInbox(`No neighbors to speak to...(no energy lost).`);
                return; /////////////////
            }

            for (let i = 0; i < nearbyZots.length; i++) {
                this.messagePidImmediately(nearbyZots[i], `At ${land.loc}, ${speaker} has ${pastTense} to ${recipients}:\n\n${msg}\n`);
            }
            addToCurrentInbox(`At ${land.loc}, you have ${pastTense} to ${recipients} for ${speakCost} energy (${this.playerEnergies[this.id]}e left).`);
        }

        logWarning("this.playerInventories[this.id].chatStat " + this.playerInventories[this.id].chatStat);
        this.playerInventories[this.id].chatStat++;
        this.playerEnergies[this.id] -= cost;
    }

    addToInbox(pid, msg) {
        if (!msg) {
            logWarning("WARNING: Please provide two non null arguments to addToInboxByPid");
            logWarning("WARNING:" + pid);
            logWarning("WARNING:" + msg);
            return;
        }
        if (pid < 0 || pid >= this.playerNames.length) {
            logWarning("oob pid: " + pid);
            return;
        }

        addToPlayerInboxByPlayerName(this.playerNames[pid], msg);
    }

    // Convert pid to user and send message instantly, maybe only used by speak/shout/bid?
    messagePidImmediately(pid, msg) {
        if (msg == '') {
            logWarning("WARNING: Please provide two non null arguments to messagePid");
            return;
        }
        if (pid < 0 || pid >= this.playerNames.length) {
            logWarning("oob pid: " + pid);
            return;
        }

        messagePlayerImmediatelyByPlayerName(this.playerNames[pid], msg);
    }


    viewNormal(pid) {
        addToCurrentInbox(getScreen(this, pid, normalView));
    }
    viewAuctions(pid) {
        addToCurrentInbox(getScreen(this, pid, auctionView));
    }
    viewInventory(pid) {
        addToCurrentInbox(getScreen(this, pid, inventoryView));
    }
    viewPlayers(pid) {
        addToCurrentInbox(getScreen(this, pid, playersView));
    }
    viewLands(pid) {
        addToCurrentInbox(getScreen(this, pid, landView));
    }
    viewTrades(pid) {
        addToCurrentInbox(getScreen(this, pid, tradesView));
    }
    viewACraft(pid, craftName) {
        addToCurrentInbox(getScreen(this, pid, null, craftName));
    }
    viewPlot(pid, loc) {
        addToCurrentInbox(getScreen(this, pid, normalView, null, loc));
    }
    viewAPlayer(pid, otherPid) {
        addToCurrentInbox(getScreen(this, pid, null, null, null, otherPid));
    }
}