import { getInboxes } from './output.js'

let seeTheZotChannel;
let publicSquareChannel;
let zotRole;

const zotRoleId = '1285138030281232406';

export const lizzieSummary = "\"See The Zot\" is a Discord messaging game. Send this bot a Direct Message (DM) to begin."

                            + "\n\nA game can last from 30 minutes to an hour, or forever."
                            + " If there's a game running right now, you can join. Right now, the bot can only run 1 game at a time."
                            + " If there's not a game running right now, you can play solo."

                            + "\n\nWhile everyone will be messaging this bot individually, they will all be in the same game."
                            + " During gameplay, everyone will have a limited amount of time (default is 120 seconds) to make their plans."
                            + " The game will start paused. You can play while paused, use 'ready' to start the next day."
                            + " When the time is up or all players are 'readay', all plans by all players are executed simultaneously. Then planning for the next day begins."

                            + "\n\nWhat will you CRAFT?"
                            + "\nWhere will you MOVE?"
                            + "\nWith whom will you TRADE?"
                            + "\nGeorge only knows."

                            + "\n\Type 'help' or '?' to this bot for more info."


export function setChannels(stzChannel, psChannel) {
    seeTheZotChannel = stzChannel;
    publicSquareChannel = psChannel;
    zotRole = publicSquareChannel.guild.roles.cache.get(zotRoleId);
    if (!zotRole) console.warn("bad role id: " + zotRoleId);
}

export async function setLizzieAvailable() {
    try {
        // Fetch the last 10 messages (you can adjust this number if needed)
        const messages = await seeTheZotChannel.messages.fetch({ limit: 1 });

        // Convert messages to an array and get the second message
        const messageArray = Array.from(messages.values());
        const availabilityMessage = messageArray[0];

        if (availabilityMessage) {
            const currentTime = new Date();
            const timeStamp = currentTime.toLocaleString('en-US', { timeZoneName: 'short' });
            await availabilityMessage.edit(`\`\`\`(Bot is currently running ${timeStamp})\`\`\``);
            console.log('Posted lizzie is available.');
        } else {
            console.log('Failed to find a second message for lizzie.');
        }
    } catch (error) {
        console.error('Failed to edit the message:', error);
    }
}


export async function setLizzieUnavailable() {
    try {
        // Fetch the last 10 messages (you can adjust this number if needed)
        const messages = await seeTheZotChannel.messages.fetch({ limit: 2 });

        // Convert messages to an array and get the second message
        const messageArray = Array.from(messages.values());
        const availabilityMessage = messageArray[0];


        if (availabilityMessage) {
            await availabilityMessage.edit(`\`\`\`(Bot not running right now. Ping maaaaxaxa to run it.)\`\`\``);
            console.log('Posted lizzie is unavailable.');
        } else {
            console.log('Failed to find a second message for lizzie.');
        }
    } catch (error) {
        console.error('Failed to edit the message:', error);
    }
}


export async function assignAllPlayersRole() {
    if (!publicSquareChannel) {
        console.warn("no public square, can't assignAllPlayersRole");
        return;
    }

    let userIds = [];
    for (const [username, inbox] of Object.entries(getInboxes())) {
        const { user, mail, inGame } = inbox;
        if (inGame) {
            try {
                // Remove the role from the user who sent the command
                const guildMember = await publicSquareChannel.guild.members.fetch(user.id);
                if (guildMember) {
                    await guildMember.roles.add(zotRole);
                    userIds.push(user.id);
                }
                else console.warn(`can't add role, user not a guild member: <@${user.id}>`);

            } catch (error) {
                console.error('Failed to assignAllPlayersRole:', error);
            }
        }
        else console.log("not in game...");
    };

    let msg = `\`\`\`The following zots have imagined themselves into being:\`\`\``;
    userIds.forEach(id => {
        msg += `<@${id}> `;
    });
    //msg += '```';
    //publicSquare.send(msg);
}

export async function removeRole(user, silently) {
    if (user && publicSquareChannel && zotRole) {
        try {
            // Remove the role from the user who sent the command
            const guildMember = await publicSquareChannel.guild.members.fetch(user.id);
            if (guildMember) {
                await guildMember.roles.remove(zotRole);
                if (!silently) publicSquareChannel.send(`<@${user.id}> unimagined itself.`);
            }
            else console.warn("can't remove role, user not a guild member: " + user.username);
        } catch (error) {
            console.error('Failed to removeRole:', error);
        }
    }
}

export async function unassignAllMembersJustInCase() {
    if (!publicSquareChannel) {
        logWarning("no public square, can't unassignAllMembersJustInCase");
        return;
    }

    try {
        // Remove the role from the user who sent the command
        const members = await publicSquareChannel.guild.members.fetch();

        // Loop through all members and remove the role if they have it
        for (const [memberId, member] of members) {

            const { displayName } = member;

            if (member.roles.cache.has('1285138030281232406')) {
                try {
                    await member.roles.remove(zotRole);
                    console.log(`Removed zot role from ${displayName}`);
                } catch (error) {
                    console.error(`Failed to remove role from ${displayName}:`, error);
                }
            }
        }

    } catch (error) {
        console.error('Failed to unassignAllMembersJustInCase:', error);
    }
}
