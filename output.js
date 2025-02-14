// This is now Discord-specific
let currentInbox            = null;
let isHandlingConsole       = false;
let impersonating           = false;
let consolePlayerName       = '';
let consoleMail             = '';

const playerNameToUser = new Map();
const inboxes = new Map();


export function logDEBUG(msg) {
    console.log("DEBUG: " + msg);
}

export function logWarning(msg, showTrace=true) {
    console.warn("WARNING: " + msg);
    if (!showTrace) console.log(new Error().stack);
}

export function tempLog(msg, showTrace=true) {
    console.warn("TEMP: " + msg);
    if (!showTrace) console.log(new Error().stack);
}

export function getInboxes() {
    return inboxes;
}

export function startHandleConsoleInput() {
    isHandlingConsole = true;
    if (!impersonating) currentInbox = null;
}

export function setConsolePlayerName(newName) {
    consolePlayerName = newName;
    impersonating = false;
    for (const [username, inbox] of inboxes) {
        if (inbox.playerName === newName) {
            console.log(`impersonating a Discord user as ${newName}!`);
            impersonating = true;
            currentInbox = inbox;
        }
    }
}

export function getConsolePlayerName() {
    return consolePlayerName;
}

export function startHandlingDiscordInput(user) {
    isHandlingConsole = false;
    if (!inboxes[user.username]) {
        inboxes[user.username] = { 
            user: user, 
            playerName: '',
            mail: "", 
            inGame: false, 
            spokenTo: 0 
        };  
    }
    currentInbox = inboxes[user.username];
    return currentInbox.playerName;
}

export function assignPlayerToInbox(playerName) {
    if (currentInbox) {
        const oldName = playerNameToUser[playerName];
        if (oldName && oldName != playerName) console.log(`reassigned ${playerName} to inbox`);
        else console.log(`assigned ${playerName} to inbox`);
        playerNameToUser[playerName] = playerName;
        currentInbox.playerName = playerName;
        if (currentInbox.user) playerNameToUser[playerName] = currentInbox.user;
    }
    else if (isHandlingConsole) {
        consolePlayerName = playerName;
        console.log(`console player is now ${playerName}`);
    }
    else logWarning("no inbox to assign player to");
}

export function setRoleInfo(lizzieChannel, channel, role) {
    seeTheZot = lizzieChannel;
    publicSquare = channel;
    zotRole = role;
}

export function messageCurrentInboxImmediately(msg) {
    if (currentInbox) {
        currentInbox.user.send(`\`\`\`${msg}\`\`\``).catch(console.error);
    }
    else if (isHandlingConsole) {
        console.log("TO CUR INBX IMM: " + msg)
    }
    else logWarning("no inbox for discord user?");
}

export function messagePlayerImmediatelyByPlayerName(playerName, msg) {
    const user = playerNameToUser[playerName];
    if (user) {
        user.send(`\`\`\`${msg}\`\`\``).catch(console.error);
    }
    else if (!isHandlingConsole) {
        logWarning(`Couldn't find user for ${playerName}.`);
    }

    console.log(`IMMEDIATE TO ${playerName}: ${msg}`);
}

export function playerInGame(playerName) {
    const user = playerNameToUser[playerName];
    if (user) {
        const inbox = inboxes[user.username];
        inbox.inGame = true;
    }
    else if (!isHandlingConsole) {
        logWarning(`Couldn't find user for ${playerName}.`);
    }
    console.log(`${playerName} inGame set true`);
}

export function playerLeftGame(playerName) {
    const user = playerNameToUser[playerName];
    if (user) {
        playerNameToUser.delete(playerName);
        const inbox = inboxes[user.username];
        inbox.inGame = false;
        inbox.playerName = '';
        inbox.mail = '';
        if (impersonating) {
            impersonating = false;
            consolePlayerName = '';
        }
    }
    else if (isHandlingConsole) {
        // If impersonating and handling console, should have ended up above
        consolePlayerName = '';
        consoleMail = '';
        if (impersonating) logWarning("how did we not find user?");
    }
    else logWarning(`Couldn't find user for ${playerName}.`);
    console.log(`${playerName} left game.`);
}


export function messageAllPlayersImmediately(msg, ignoreCurrentMailbox) {
    console.log("TO ALL IMMEDIATE:\n" + msg);
    Object.values(inboxes).forEach((inbox) => {
        if (ignoreCurrentMailbox && inbox == currentInbox) {
            // do nothing
        }
        else if (inbox.inGame) inbox.user.send(`\`\`\`${msg}\`\`\``).catch(console.error);
    });
}

export function addToAllInboxes(msg) {
    console.log(`TO ALL INBOXES: ${msg}`);
    Object.values(inboxes).forEach((inbox) => {
        if (inbox.inGame) inbox.mail += "\n" + msg;
    });
}

export function addToCurrentInbox(msg) {
    if (currentInbox) {
        if (currentInbox.mail == '') currentInbox.mail = msg;
        else currentInbox.mail += `\n` + msg;
    }
    else if (isHandlingConsole) {
        if (consoleMail == '') consoleMail = msg;
        else consoleMail += `\n` + msg
    }
    else console.warn("No current inbox for msg: " + msg);
}

export function addToPlayerInboxByPlayerName(playerName, msg) {
    const user = playerNameToUser[playerName];
    if (user) {
        inboxes[user.username].mail += `\n` + msg;
    }
    else if (isHandlingConsole) {
        console.log(`TO INBOX ${playerName}: ${msg}`);
    }
    else console.warn("\nNo user inbox for user: " + playerName + ".\nMessage undelivered:\n\n" + msg);
}

export function addInvalidCurrentInbox(msg = '') {
    const fullMsg = msg === '' ? "INVALID INPUT" : "INVALID INPUT: " + msg;
    addToCurrentInbox(fullMsg);
}

export function readCurrentInboxMail() {
    readInbox(currentInbox, true);
}

export function readAllInboxes() {
    Object.values(inboxes).forEach((inbox) => {
        readInbox(inbox, false);
    });
    if (isHandlingConsole) readCurrentInboxMail();
}

export function currentInboxSpokenTo() {
    if (currentInbox) return currentInbox.spokenTo;
    else if (isHandlingConsole) return 999;
    else {
        logWarning("no current inbox");
        return 0;
    }
}

export function clearCurrentInbox() {
    if (currentInbox) currentInbox.mail = '';
    else if (isHandlingConsole) consoleMail = '';
    else logWarning("no current inbox to clear");
}

export function speakToCurrentInbox() {
    if (currentInbox) currentInbox.spokenTo++;    
    else if (!isHandlingConsole) logWarning("no current inbox to spokenTo++");
}

function readInbox(inbox, logToConsole) {
    if (isHandlingConsole) {
        if (!consoleMail) return; //////////////////////////////////

        if (consoleMail.length > 1990) logDEBUG("console mail length " + consoleMail.length);
        console.log(`Lizzie:\n${consoleMail}`);
        consoleMail = '';
    }
    else if (inbox) {
        let msg = inbox.mail;
        if (!msg) return; //////////////////////////////////

        while (msg.length > 1990) {
            const truncated = msg.substring(0, 1990);
            inbox.user.send(`\`\`\`${truncated}\`\`\``).catch(console.error);
            msg = msg.substring(1990);

            if (logToConsole) {
                console.log("splitting message.");
                console.log(inbox.user.username + ": " + truncated);
            }
            
        }
        if (logToConsole) console.log(inbox.user.username + ": " + msg);
        inbox.user.send(`\`\`\`${msg}\`\`\``).catch(console.error);
        
        inbox.mail = '';
    }
    else logWarning("can't readInbox, no inbox to read.");
}

export function checkAdmin() {
    if (isHandlingConsole) return true;
    if (!currentInbox.user) return false;
    if (currentInbox.user.id == process.env.ADMIN_DISCORD_ID) return true;
    return false;
}