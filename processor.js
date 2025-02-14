import { getRandomElement, getRandomInt, removeFromArr, shuffleArray, vecToLoc } from "./helpers.js";
import { bloom, botGathMax, botGathMin, changeLandResources, changePlayerResources, getagetsName, getResourceInfo, netMax, netMin, resCodes, resCodeToResName, squareEnergy } from "./henry.js";
import { addToAllInboxes, addToCurrentInbox, logDEBUG, logWarning, readAllInboxes } from "./output.js";
import { auctionView, getScreen } from "./screenDrawer.js";

export function processDay(gj) {

    if (gj.allowRejoining) {
        gj.noMoreRejoining();
    }
    let everyoneDone = false;
    let planNum = -1;

    let randomIds = [];
    for (let i = 0; i < gj.playerPlans.length; i++) {
        randomIds.push(i);
        if (gj.playerPlans[i].length > 0) gj.addToInbox(i, `\nDay ${gj.dayCount} ends. Here's how your plans went:`)
    }

    randomIds = shuffleArray(randomIds);

    // #TODO Snake draft, in other words, reverse the order of processing each day
    // Starting with everyone's 1st plan, loop through everyone
    // Then loop through everyone's 2nd plan, until everyone's out of plans
    // process plans
    while (!everyoneDone) {
        if (planNum > gj.maxPlans) {
            logWarning("process day was maybe falling into an infinite loop.");
            return;
        }

        everyoneDone = true;
        planNum++;
        for (let i = 0; i < randomIds.length; i++) {
            const pid = i;
            gj.metaPlans[pid].ready = false;

            let plans = gj.playerPlans[pid];
            if (planNum == 0) {
                if (plans.length == 0) {
                    continue;
                }
            }

            if (plans.length <= planNum) continue;

            everyoneDone = false;
            let pn = plans[planNum];
            switch (pn.title) {
                case "Move:":
                    gj.executeMove(pn, pid);
                    break;
                case "Gather:":
                    gj.executeGather(pn, pid);
                    break;
                case "Craft:":
                    gj.executeCraft(pn, pid);
                    break;
                case "Seize:":
                    gj.executeSeize(pn, pid);
                    break;
                // case "Attack:":
                //     gj.executeAttack(pn, pid);
                //     break;
                
                default:
                    addToCurrentInbox("WARNING: Unhandled plan title: " + pn.title);
                    break;
            }
        }
    }

    // Run the nup nets
    // Run the getagets
    // process improvements
    for (let i = 0; i < gj.playerImprovements.length; i++) {

        // I guess we also sum up plans?
        if (gj.playerPlans[i].length == 0) gj.addToInbox(i, `\nDay ${gj.dayCount} ends. You had no plans today. Enter '?' to view plan commands.`);

        const imps = gj.playerImprovements[i];
        const nets = imps.filter(imp => imp.craftName == 'nupnet' && imp.hp > 0);
        nets.forEach(nupnet => {
            const land = gj.getLandByLoc(nupnet.loc); // Relies on map, so in George
            const resInfo = getResourceInfo(land, 'n');
            const netted = Math.min(getRandomInt(netMin, netMax + 1), resInfo.amount);
            if (netted > 0) {
                changeLandResources(land, 'n', -netted);
                const leftover = gj.tryStashResources(i, 'n', netted, land);
                if (leftover < netted) {
                    gj.addToInbox(i, `Nup net at ${land.loc} stashed ${netted - leftover} nup.`);
                }
                if (leftover > 0) {
                    changeLandResources(land, 'n', leftover);
                    gj.addToInbox(i, `Nup net spilled ${leftover}n onto ${land.loc}, need more ploset space.`);
                }
            }
            else gj.addToInbox(i, `Nup net at ${land.loc} has nothing to collect.`);
        });

        const getagets = imps.filter(imp => imp.craftName == getagetsName && imp.hp > 0);
        getagets.forEach(getagets => {
            const land = gj.getLandByLoc(getagets.loc); // Relies on map, so in George
            const resInfo = getResourceInfo(land, 'g');
            const harvested = Math.min(getRandomInt(botGathMin, botGathMax + 1), resInfo.amount);
            if (harvested > 0) {
                changeLandResources(land, 'g', -harvested);
                const leftover = gj.tryStashResources(i, 'g', harvested, land);
                if (leftover < harvested) {
                    gj.addToInbox(i, `Getagets at ${land.loc} stashed ${harvested - leftover} getacles.`);
                }
                if (leftover > 0) {
                    changeLandResources(land, 'g', leftover);
                    gj.addToInbox(i, `Getagets spilled ${leftover}g onto ${land.loc}, need more ploset space.`);
                }
            }
            else gj.addToInbox(i, `Getagets at ${land.loc} has nothing to collect.`);
        });
    }

    for (let i = 0; i < gj.playerNames.length; i++) {

        // Clear plans
        // Reset player planned positions to player positions
        // Clear meta plans
        const pos = gj.playerPositions[i];
        gj.playerPlans[i] = [];
        gj.playerPlannedPositions[i] = pos;
        gj.metaPlans[i].unknownEnergies = 0;
        gj.playerEnergies[i] += gj.energyPerDay;

        // Check for bed 
        const land = gj.map[pos[0]][pos[1]];
        const square = land.improvements.find(imp => imp.craftName == 'energysquare' && imp.hp > 0 && imp.owner == i);
        if (square) {
            //square.hp--;
            const gain = gj.energyPerDay + squareEnergy
            gj.playerEnergies[i] += gain;
            gj.addToInbox(i, `You rested on your square (${square.hp} hp). Gained ${gain}e last night.`);
        }
        else {
            const gain = gj.energyPerDay;
            if (gj.playerEnergies[i] > gj.getMaxEnergy(i)) {
                gj.playerEnergies[i] = gj.getMaxEnergy(i);
            }
            gj.addToInbox(i, `You rested. Gained ${gain}e.`);
        }

        if (gj.playerEnergies[i] > gj.getMaxEnergy(i)) {
            gj.playerEnergies[i] = gj.getMaxEnergy(i);
            gj.addToInbox(i, `You're capped at ${gj.playerEnergies[i]}/${gj.getMaxEnergy(i)}e`);
        }
        else gj.addToInbox(i, `You're at ${gj.playerEnergies[i]}/${gj.getMaxEnergy(i)}e`);


        // Depreciate land improvements
        // then from bottom to top, since we may remove some
        // process depreciation
        let atLeastSomethingDeterioratedButDidntCrumble = false;
        let playerImps = gj.playerImprovements[i];
        logDEBUG("has imps: " + playerImps.length);
        for (let index = playerImps.length - 1; index >= 0; index--) {
            const imp = playerImps[index];
            const impLand = gj.getLandByLoc(imp.loc);
            logDEBUG("has imp: " + imp.craftName);
            imp.hp -= 1;
            if (imp.hp <= 0) {
                let didSpill = false;
                if (imp.craftName == 'ploset') {
                    gj.tryStashResources(i, 't', imp['t'], impLand);
                    gj.tryStashResources(i, 'n', imp['n'], impLand);
                    gj.tryStashResources(i, 'w', imp['w'], impLand);
                    gj.tryStashResources(i, 'g', imp['g'], impLand);
                    gj.tryStashResources(i, 'm', imp['m'], impLand);
                    if (imp['t'] > 0 || imp['n'] || imp['w'] > 0 || imp['g'] || imp['m'] > 0) { 
                        didSpill = true;
                        changeLandResources(impLand, 't', imp['t']);
                        changeLandResources(impLand, 'n', imp['t']);
                        changeLandResources(impLand, 'w', imp['t']);
                        changeLandResources(impLand, 'g', imp['t']);
                        changeLandResources(impLand, 'm', imp['t']);
                    }
                }
                else if (imp.craftName == 'entroset') {
                    imp.items.forEach(it => {
                        gj.tryStashItem(i, it, impLand);
                    });
                }

                gj.addToInbox(i, `Your ${imp.displayName} at ${impLand.loc} depreciated fully. It crumbles.`)
                if (didSpill) gj.addToInbox(i, `Some resources were spilled onto ${impLand.loc}.`)
                playerImps.splice(index, 1);
                removeFromArr(impLand.improvements, imp);
                logDEBUG("land improvements length after splice: " + playerImps.length);
            }
            else atLeastSomethingDeterioratedButDidntCrumble = true;
        }

        if (atLeastSomethingDeterioratedButDidntCrumble) gj.addToInbox(i, "Your improvements depreciated.");

        // Depreciate items
        // Go thru player's inventory
        // Then from bottom to top
        let atLeastOneItemDeterioratedButDidntCrumble = false;
        const items = gj.playerInventories[i].items;
        for (let index = items.length - 1; index >= 0; index--) {
            let it = items[index];
            it.hp -= 1;
            if (it.hp <= 0) {
                gj.addToInbox(i, `Your ${it.displayName} depreciated fully. It crumbles.`)
                items.splice(index, 1);
            }
            else atLeastOneItemDeterioratedButDidntCrumble = true;
        }
        if (atLeastOneItemDeterioratedButDidntCrumble) gj.addToInbox(i, "Items you are holding depreciated.");


        // Decrement rental agreements
        gj.playerLands[i].forEach(plot => {
            plot.rentalTerms.forEach(rentalTerm => {
                rentalTerm.daysLeft--;
                if (rentalTerm.daysLeft > 0) gj.addToInbox(rentalTerm.pid, `You have ${rentalTerm.daysLeft} days left on your rental agreement at ${plot.loc}.`);
                else gj.addToInbox(rentalTerm.pid, `Your rental agreement at ${plot.loc} has concluded. Your improvements at ${plot.loc} may be seized, if any. You have lost bio fence access at ${plot.loc}, if any.`);
            });
            plot.rentalTerms = plot.rentalTerms.filter(rt => rt.daysLeft > 0);
            logDEBUG("rental term for " + plot.loc + ", owner is " + gj.playerNames[plot.owner]);
            plot.rentalTerms.forEach(rentalTerm => {
                logDEBUG("rental term at " + plot.loc + ": " + gj.playerNames[rentalTerm.pid] + ", for " + rentalTerm.daysLeft);
            });

        });

    }

    // If the season has ended, cache auctions and clear seasonAuctions
    
    gj.dayCount++;
    gj.dawnWarning = false;
    gj.dayClock -= gj.secondsPerDay * 1000; // Reset the clock, keeping any excess time

    const daysLeft = gj.getDaysLeft();
    if (daysLeft < 0) logWarning("Negative days left in season? " + daysLeftInSeason);
    const seasonEnded = daysLeft <= 0;
    let concludingAuctions = [];
    if (seasonEnded) {
        gj.seasonAuctions.forEach(a => concludingAuctions.push(a));
        gj.seasonAuctions = [];
    }


    // Season!
    // Conclude auctions
    // Levy LVT! 
    // process season
    if (seasonEnded) {

        addToAllInboxes("\nSeason has ended.\n"
        + "LVT will be collected.\n"
        + "Citizen's Dividend distributed.\n"
        + "Assets depreciate.\n"
        + "Auctions conclude.\n"
        + "Nature renews.\n");

        gj.lastSeasonDate = gj.dayCount - 1;

        // process trades
        // Clean up trades
        let atLeastOneTradeRemoved = false;
        let availableTrades = [];
        gj.tradeOffers.forEach(trade => {
            if (trade.available) availableTrades.push(trade);
            else atLeastOneTradeRemoved = true;
        });
        gj.tradeOffers = [];
        availableTrades.forEach(trade => {
            gj.tradeOffers.push(trade);
        });
        if (atLeastOneTradeRemoved && gj.tradeOffers.length > 0) {
            addToAllInboxes("The list of offered trades has been pruned.");
        }

        

        for (let i = 0; i < gj.playerLands.length; i++) {

            let paidToday = 0;
            const lands = gj.playerLands[i];
            const playerName = gj.playerNames[i];
            logDEBUG("is paying their lvt now: " + playerName);

            let indexOfAbandonedLand = -1;
            let outOfCapital = false;
            for (let j = 0; j < lands.length; j++) {
                const land = lands[j];
                let due = land.lvt

                logDEBUG("owes: " + due);

                // Try to pay
                if (!outOfCapital) {
                    due = gj.payFromAccount(i, due);
                    logDEBUG("after paying from account, now: " + due);
                    
                    if (due > 0) due = gj.payFromInventoryRandomly(i, due);
                    logDEBUG("after paying from inventory, now: " + due);


                    if (due > 0) {
                        // Couldn't afford lvt, losing all remaining land
                        paidToday += land.lvt - due;
                        indexOfAbandonedLand = j;
                        outOfCapital = true;
                    }
                    else {
                        paidToday += land.lvt;
                        addToAllInboxes(`${gj.playerNames[i]} paid an LVT of ${land.lvt} for ${land.loc}.`);
                    }
                }

                if (land.abandoned) {
                    addToAllInboxes(`${gj.playerNames[i]} has abandoned ownership of ${land.plot}.`);
                    land.owner = -1;
                    land.ownerLastBid = 0;
                    land.abandoned = false;
                    land.rentalTerms.forEach(r => {
                        gj.messagePidImmediately(r.pid, `Your rental agreement at ${land.loc} has been voided due to abandonment by owner. The land is unowned.`);
                    });
                    land.rentalTerms = [];
                }

                if (outOfCapital) {
                    const debt = due * 2;
                    gj.playerInventories[i].debt += debt;
                    addToAllInboxes(`${gj.playerNames[i]} did not pay the LVT for ${land.loc}. Incurred debt of remaining LVT due x2: ${debt}. Ownership lost.`);
                    land.owner = -1;
                    land.ownerLastBid = 0;
                    land.abandoned = false;
                    land.rentalTerms.forEach(r => {
                        gj.messagePidImmediately(r.pid, `Your rental agreement at ${land.loc} has been voided due to owner defaulting on its LVT. The land is unowned.`);
                    });
                    land.rentalTerms = [];
                }
            }

            if (outOfCapital) lands.splice(indexOfAbandonedLand, lands.length - indexOfAbandonedLand);
            const balance = gj.getAccountBalance(i);
            if (balance > 0) {
                // Pay the rest as a donation!
                addToAllInboxes(`${gj.playerNames[i]} not only paid their LVT, but put extra funds in their tax account.`
                                + ` The zoot thanks you for your generosity.`
                                + ` If this was in error, please be a more mindful steward of your resources going forward. We have but one Zearth.`);

                gj.payFromAccount(i, balance);
            }

            logDEBUG("paidtoday: " + paidToday);
            gj.playerInventories[i].lifetimeLVTPaid += paidToday;
        }

        // Redistribute CD
        let playerCount = gj.playerNames.length;
        let cdReport = `\n\nA Citizen's Dividend has been paid out to each zot:`;
        resCodes.forEach(code => {
            const resName = resCodeToResName.get(code);
            let returnedWealth = 0;
            while (gj.publicTreasury[code] >= playerCount) {
                gj.publicTreasury[code] -= playerCount;
                returnedWealth++;
            }

            for (let invIndex = 0; invIndex < gj.playerInventories.length; invIndex++) {
                const inventory =  gj.playerInventories[invIndex];
                changePlayerResources(inventory, code, returnedWealth); // Hm, sucks to get overburdened by the cd though
            }

            cdReport += `\n  ${returnedWealth} ${resName}`.padEnd(18) + `(balance: ${gj.publicTreasury[code]})`
        });
        addToAllInboxes(cdReport + "\n");

        // process auctions
        // Conclude auctions, if appropriate
        concludingAuctions.forEach(auction => {

            const land = gj.getLandAtPos(auction.pos);

            let tied = [];
            let secondHighestBid = { pid: -1, amt: 0 };
            let winningBid; 
            for (let i = 0; i < auction.bids.length; i++) {
                const bid = auction.bids[i];

                // First check account, then check zot inventory
                let goodStanding = gj.playerInventories[i].debt <= 0;
                if (!goodStanding) {
                    gj.addToInbox(bid.pid, `You owe ${gj.playerInventories[i].debt}. You are not in good standing. Your bid ${bid.amt} for ${auction.loc} is discarded.`);
                    continue;
                }

                // Check if bid is winning
                if (!winningBid) {
                    winningBid = bid;
                }
                else if (bid.amt === winningBid.amt) {
                    if (tied.length == 0) tied.push(winningBid);
                    tied.push(bid);
                }
                else if (bid.amt > winningBid.amt) {
                    tied = [];
                    secondHighestBid = winningBid;
                    winningBid = bid;
                }
                else if (bid.amt > secondHighestBid.amt) {
                    secondHighestBid = bid;
                }
            }

            if (!winningBid) {
                // Everyone bid more than they can pay!
                addToAllInboxes(`Auction concluded at ${auction.loc} concluded with no effect, since no bidder was in good standing.`);
                return;
            }

            land.ownerLastBid = winningBid.amt;

            let tie = false;
            if (tied.length > 0) {
                tie = true;
                winningBid = getRandomElement(tied);
                secondHighestBid = winningBid;
            }

            const winner = gj.playerNames[winningBid.pid];
            let winnerMessage;

            if (land.owner < 0) {
                // No one owned it
                winnerMessage = `${winner} gains ownership.`;
                gj.playerLands[winningBid.pid].push(land);
            }
            else if (land.owner === winningBid.pid) {
                // Ownership retained
                winnerMessage = `${winner} retains ownership.`;
            }
            else {
                // Taking over ownership
                winnerMessage = `${winner} takes over ownership from ${gj.playerNames[land.owner]}.`;
                const oldFence = land.improvements.find(imp => imp.craftName == 'biofence' && imp.land == land);
                if (oldFence) {
                    winnerMessage = `${winner} takes over ownership from ${gj.playerNames[land.owner]}. Old bio fence destroyed. Standing rental agreements voided.`;
                    land.rentalTerms.forEach(r => {
                        gj.messagePidImmediately(r.pid, `Your rental agreement at ${land.loc} has been voided due to new ownership.`);
                    });
                    land.rentalTerms = [];
                    removeFromArr(gj.playerImprovements[oldFence.owner], oldFence);
                    removeFromArr(land.improvements, oldFence);
                }
                else winnerMessage = `${winner} takes over ownership from ${gj.playerNames[land.owner]}.`;
                gj.playerLands[winningBid.pid].push(land);
                removeFromArr(gj.playerLands[land.owner], land);
            }

            // Regardless, winner is now assigned
            land.owner = winningBid.pid;

            let secondMessage = '';
            if (secondHighestBid.pid >= 0) {
                secondMessage = `The second highest bid was ${secondHighestBid.amt}, which sets the LVT.`;
                land.lvt = secondHighestBid.amt;
            }
            else {
                secondMessage = "No second bid, therefore the LVT is 0.";
                land.lvt = 0;
            }
            if (tie) {
                addToAllInboxes(`Auction concluded at ${auction.loc} concluded with a tie!`
                + ` Winning bidder randomly chosen to be ${winner} with a shared bid of ${winningBid.amt}, which will now be the LVT. Due at season's end.`);
            }
            else addToAllInboxes(`Auction concluded at ${auction.loc}. Winner was ${winner}. ${secondMessage} ${winnerMessage}`);
        });

        // Blooming
        addToAllInboxes("Nature has brought forth her fruits.");
        gj.seasonType += 1;
        if (gj.seasonType > 2) gj.seasonType = 0;

        // Now we get to go from bot left to top right
        // Going column by column
        // Bottom to top
        for (let x = 0; x < gj.mapSize[0]; x++) {
            for (let y = 0; y < gj.mapSize[1]; y++) {
                bloom(gj.map[x][y], false);
            }
        }
    }

    if (daysLeft == 2) {
        addToAllInboxes(`There's ${gj.getTimeUntilNextDay()}. ${gj.getSeasonRemaining()}\n`);
        addToAllInboxes("(This is the last day to start an auction that will complete before next season.)");
    }
    else if (daysLeft == 1) {
        addToAllInboxes(`There's ${gj.getTimeUntilNextDay()}. Seasons ends today.\n`)
        addToAllInboxes("Auctions conclude after today and LVT will be collected.");
        addToAllInboxes("(Any auctions started today will conclude at end of next season.)");
        if (gj.seasonAuctions.length > 0) {
            for (let i = 0; i < gj.playerNames.length; i++) {
                getScreen(gj, i, auctionView);
            }
        }
    }
    else addToAllInboxes(`There's ${gj.getTimeUntilNextDay()}. ${gj.getSeasonRemaining()}\n`);

    readAllInboxes();

    if (gj.dayCount == gj.days + 1) {
        addToAllInboxes("\n\n\n\nOk, the days are up!\nHow do you feel?\nDid you win?\nDid you achieve progress without poverty?\n");
        gj.showScoreboard();
    }
}
