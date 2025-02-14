import { equalArray, vecToLoc, within1Move } from "./helpers.js";
import { closetCapacity, craft_title, getClosetSpace, getTerrainMovementCost, hammerName, hoverboardName, hoverboardWear, injuryCapReduction, jumpName, mobile_width, mountainTerrain, move_title, plannedPosIcon, squareEnergy, tech, toolWear, tradeCost, whammerReduction } from "./henry.js";


export const normalView        = 1;
export const auctionView       = 2;
export const inventoryView     = 3;
export const playersView       = 4;
export const landView          = 5;
export const tradesView        = 6;
export const plansView         = 7;
// Other views are targetPlayer, craftName

export function getScreen(gj, pid, view, craftName, loc, targetPid=-1) {

    const techObj = craftName ? tech.find(it => it.craftName == craftName) : null;
    const land = loc ? gj.getLandByLoc(loc) : gj.getLandByPid(pid);
    
    const leftColWidth = mobile_width;
    const rightColWidth = mobile_width;
    let rightCol = [];
    rightCol.push('');
    let middleCol = [];
    middleCol.push('');
    let leftCol = [];
    leftCol.push('');
    let belowRows = [];

    if (true) {

        const plans = gj.playerPlans[pid];
        const metaPlan = gj.metaPlans[pid];

        rightCol.push(`PLANS:`);
        if (plans.length == 0) {
            rightCol.push("-no plans made-");
        }


        const inv = gj.playerInventories[pid];
        if (!inv) {
            logWarning("bad pid or something: " + pid);
            return;
        }

        let hoverboards = inv.items.filter(it => it.craftName == hoverboardName);
        let hypotheticalBoards = [];
        hoverboards.forEach(board => {
            hypotheticalBoards.push(board.hp);
        });
        let jumps = inv.items.filter(it => it.craftName == jumpName).length;
        let hammers = inv.items.filter(it => it.craftName == hammerName);
        let hypotheticaHammers = [];
        hammers.forEach(ham => {
            hypotheticaHammers.push(ham.hp);
        });
        let total = 0;
        let i = 1;
        gj.playerPlans[pid].forEach(plan => {
            let cost = plan.cost;
            if (plan.cost < 0) {
                cost = 0;
            }
            else if (plan.title == move_title) {
                if (plan.terrain == mountainTerrain && jumps > 0) {
                    jump--;
                    plan.details = `jump to ${pn.loc}(${pn.terrain})`;
                    cost = 0;
                } 
                else if (hypotheticalBoards.length > 0) {
                    hypotheticalBoards[0].hp -= hoverboardWear;
                    if (hypotheticalBoards[0].hp <= 0) hypotheticalBoards.splice(0, 1);
                    cost = Math.round(getTerrainMovementCost(plan.terrain) / 2);
                    plan.details = `hover to ${pn.loc}(${pn.terrain})`;
                }
                else 
                    {
                    cost = getTerrainMovementCost(plan.terrain);
                    plan.details = `move to ${pn.loc}(${pn.terrain})`;
                }
            }
            else if (plan.title == craft_title) {
                if (hypotheticaHammers > 0) {
                    hypotheticaHammers[0].hp -= toolWear;
                    let reductions = 1;
                    let s = '';
                    if (hypotheticaHammers[1]) {
                        hypotheticaHammers[1].hp -= toolWear;
                        reductions = 2;
                        s = 's';
                        if (hypotheticaHammers[1].hp <= 0) hypotheticaHammers.splice(1, 1);
                    }
                    if (hypotheticaHammers[0].hp <= 0) hypotheticaHammers.splice(0, 1);
                    cost = Math.max(0, craftCost - whammerReduction * reductions);
                    details = `${pn.craftName} (with whammer${s})`; 
                }
                else {
                    details = `${pn.craftName}`; 
                    cost = plan.cost;
                }
            }

            total += cost;
            const costStr = cost < 0 ? '?' : cost.toString();
            rightCol.push(`${i}. ${plan.title} ${plan.details}`.substring(0, mobile_width - 5).padEnd(mobile_width - 5) + `-${costStr}e`.padStart(5));
            i++;
        });

        // if (gj.metaPlans[pid].unknownEnergies > 0) return `${gj.playerEnergies[pid] - total}e - ?e`;
        // else return `${gj.playerEnergies[pid] - total}e`;
        // gj.playerPlans[gj.id].forEach(plan => {
        //     let costStr = plan.cost < 0 ? '?' : plan.cost;
        //     if (plan.cost > 0) total += gj.getPlanCost(plan);
        //     rightCol.push(`${i}. ${plan.title} ${plan.details}`.substring(0, mobile_width - 5).padEnd(mobile_width - 5) + `-${costStr}e`.padStart(5));
        //     i++;
        // });

        const rPad = 5;
        const lPad = mobile_width - rPad;
        const totalCost = metaPlan.unknownEnergies > 0 ? `${total}e?` : `${total}e`;
        const remaining = metaPlan.unknownEnergies > 0 ? `${gj.playerEnergies[pid] - total}e?` : `${gj.playerEnergies[pid] - total}e`;


        rightCol.push(`TOTAL COST`.padEnd(lPad, ".") + `-${totalCost}`.padStart(rPad, "."));
        rightCol.push("");
        rightCol.push(`REMAINING`.padEnd(lPad, ".") + `${remaining}`.padStart(rPad, "."));

        rightCol.push("");
        const planLand = gj.getLandAtPos(gj.playerPlannedPositions[pid]);
        if (planLand.improvements.find(imp => imp.craftName == 'ploset' && imp.owner == pid)) {
            rightCol.push(`Rest on an e square gives ${gj.energyPerDay + squareEnergy}e.`);
        }
        else rightCol.push(`Rest without an e square gives ${gj.energyPerDay}e.`);
    }


    if (view == auctionView) {
        const invCount = gj.getPlayerInventoryCount(pid);
        const pLand = gj.getLandByPid(pid);

        leftCol.push(`Holding:`.padEnd(14) + `(${invCount}/${gj.getCapacity(pid)})`.padStart(9));
        leftCol.push(`Stashed on ${pLand.loc}:`.padEnd(14) + `TODO`.padStart(9));
        leftCol.push(`Stashed other:`.padEnd(14) + `TODO`.padStart(9));
        leftCol.push("");

        if (gj.seasonAuctions.length == 0) leftCol.push("No ongoing auctions.");

        if (gj.getDaysLeft() == 2) {
            leftCol.push("Last day to start an auction!");
        }
        else if (gj.getDaysLeft() == 1) {
            leftCol.push("Last day to bid!");
        }

        let plotsOwned = [];
        let biddedOn = [];
        let uninvolved = [];
        
        gj.seasonAuctions.forEach(a => {
            const land = gj.map[a.pos[0]][a.pos[1]];
            const yourBid = a.bids.find(b => b.pid == pid);
            const ownerName = land.owner >= 0 ? "    owned by " + gj.playerNames[land.owner] : "   owned by: -";
            
            if (land.owner == pid) {
                plotsOwned.push(`${a.loc}(${land.terrain}), LVT:` +  `${land.lvt}`.padStart(4) + `, your bid:` + `${yourBid.amt}`.padStart(4));
                plotsOwned.push(ownerName);
            }
            else if (yourBid) {
                biddedOn.push(`${a.loc}(${land.terrain}), LVT:` +  `${land.lvt}`.padStart(4) + `, your bid:` + `${yourBid.amt}`.padStart(4));
                biddedOn.push(ownerName);
            }
            else {
                uninvolved.push(`${a.loc}(${land.terrain}), LVT:` +  `${land.lvt}`.padStart(4) + `, your bid:` + `-`.padStart(4));
                uninvolved.push(ownerName);
            }
        });

        // #TODO spead these along all columns nicely, if not in mobile view

        leftCol.push(""); 
        leftCol.push('AUCTIONS ON YOUR PLOTS:');
        if (plotsOwned.length > 0) {
            plotsOwned.forEach(report => {
                leftCol.push(report);
            });
        }
        else leftCol.push('(no auctions on your plots)');
        leftCol.push("");

        leftCol.push('AUCTIONS YOU BID IN:');
        if (biddedOn.length > 0) {
            biddedOn.forEach(report => {
                leftCol.push(report);
            });
        }
        else leftCol.push(`(you haven't bid on other plots)`);
        leftCol.push("");

        leftCol.push(`AUCTIONS YOU HAVEN'T BID IN:`);
        if (uninvolved.length > 0) {
            uninvolved.forEach(report => {
                leftCol.push(report);
            });
        }
        else leftCol.push(`(no other auctions)`);
    }
    else if (view == inventoryView) {

        leftCol.push("Inventory of Items:");
        let i = 1;
        gj.playerInventories[pid].items.forEach(it => {
            leftCol.push(`${i}. ${it.displayName} (${it.hp} hp)`);
            if (it.details) {
                let str = it.details;
                const buffer = 5;
                while (str.length > leftColWidth - buffer) {
                    const addDash = str.charAt(leftColWidth - buffer) != ' ';
                    let slice = addDash ? str.substring(0, leftColWidth - buffer - 1) + '-' : str.substring(0, leftColWidth - buffer);
                    leftCol.push(slice)
                    str = addDash ? str.substring(leftColWidth - buffer - 1) : str.substring(leftColWidth - buffer);
                }
                leftCol.push(str);
            }

            i++;
        });
        if (gj.playerInventories[pid].items.length == 0) leftCol.push("(you have no items)");

        const pLand = gj.getLandByPid(pid);
        const imp = pLand.improvements.find(imp => imp.craftName == 'entroset' && imp.hp > 0 && imp.owner == pid);
        if (imp) {
            leftCol.push("");
            leftCol.push(`There's ${imp.items.length} items in an entroset.`);
        }
    }
    else if (techObj) {
        const inv = gj.playerInventories[pid];

        const lPad = 13;
        const invPad = 6;

        const invCount = gj.getPlayerInventoryCount(pid);
        leftCol.push(`you (${invCount}/${gj.getCapacity(pid)})`.padStart(5) + `${craftName}`.padStart(lPad - 2));
        
        leftCol.push(`${inv.tobbles}t`.padStart(invPad)   + `${techObj.tobbles}t`.padStart(lPad));
        leftCol.push(`${inv.nup}n`.padStart(invPad)       + `${techObj.nup}n`.padStart(lPad));
        leftCol.push(`${inv.wiggsies}w`.padStart(invPad)  + `${techObj.wiggsies}w`.padStart(lPad));
        leftCol.push(`${inv.getacles}g`.padStart(invPad)  + `${techObj.getacles}g`.padStart(lPad));
        leftCol.push(`${inv.moaf}m`.padStart(invPad)      + `${techObj.moaf}m`.padStart(lPad));
        leftCol.push('');

        const pLand = gj.getLandByPid(pid);
        if (techObj.isLandImprovement) {
            leftCol.push('This is a land improvement.');

            const here = pLand.improvements.filter(imp => imp.craftName == techObj.craftName && imp.hp > 0);
            const ownedHere = here.filter(imp => imp.owner == pid);
            leftCol.push(`There's ${here.length} here (owned: ${ownedHere.length}).`);

            const allYouOwn = gj.playerImprovements[pid].filter(imp => imp.craftName == techObj.craftName && imp.hp > 0);
            leftCol.push(`You own ${allYouOwn.length - ownedHere.length} others.`);
        }
        else {

            const holding = gj.playerInventories[pid].items.filter(imp => imp.craftName == techObj.craftName && imp.hp > 0).length;
            leftCol.push(`You're holding ${holding}.`);

            const entrosets = gj.playerImprovements[pid].filter(imp => { imp.craftName == 'entroset' && imp.hp > 0 });
            let entroseted = 0;
            entrosets.forEach(ent => {
                entroseted += ent.items.filter(it => it.craftName == techObj.craftName).length;
            });
            leftCol.push(`You have ${entroseted} in entrosets.`);
        }
        leftCol.push('');

        let str = techObj.displayName + `(${techObj.hp} hp):\n`;
        const buffer = 2;
        while (str.length > leftColWidth - buffer) {
            const addDash = str.charAt(leftColWidth - (buffer + 1)) != ' ';
            let slice = addDash ? str.substring(0, leftColWidth - buffer) + '-' : str.substring(0, leftColWidth - buffer);
            leftCol.push(slice)
            str = addDash ? str.substring(leftColWidth - (buffer + 1)) : str.substring(leftColWidth - buffer);
        }
        leftCol.push(str);
    }
    else if (targetPid >= 0) {

        const inv = gj.playerInventories[targetPid];
        const invCount = gj.getPlayerInventoryCount(targetPid);
        const lnd = gj.getLandByPid(targetPid);

        const invPad = 6;
        const rPad = 6;
        const they = `${gj.playerNames[targetPid]}`;
        const reses = `${lnd.loc}(${lnd.terrain})`;

        const theirTrades = gj.tradeOffers.filter(t => t.pid == targetPid && t.available);
        const tr = theirTrades.length > 0 ? '(?)' : '';
        const rdy = gj.metaPlans[targetPid].ready ? '(rdy)' : '';
        leftCol.push(`Looking at ${they}${tr}${rdy}:`);
        leftCol.push('');
        leftCol.push(`${they} |`.padStart(invPad + 10) + reses.padStart(rPad + 1));
        
        leftCol.push(`tobbles:`.padEnd(10)  + `${inv.tobbles}t |`.padStart(invPad)   + `${land.resources.tobbles}t`.padStart(rPad));
        leftCol.push(`nup:`.padEnd(10)      + `${inv.nup}n |`.padStart(invPad)       + `${land.resources.nup}n`.padStart(rPad));
        leftCol.push(`wiggsies:`.padEnd(10) + `${inv.wiggsies}w |`.padStart(invPad)  + `${land.resources.wiggsies}w`.padStart(rPad));
        leftCol.push(`getacles:`.padEnd(10) + `${inv.getacles}g |`.padStart(invPad)  + `${land.resources.getacles}g`.padStart(rPad));
        leftCol.push(`moaf:`.padEnd(10)     + `${inv.moaf}m |`.padStart(invPad)      + `${land.resources.moaf}m`.padStart(rPad));
        leftCol.push(``);

        let holding = `${they} is holding ${invCount}/${gj.getCapacity(targetPid)} resources.`;
        if (invCount > gj.getCapacity(targetPid)) leftCol.push(`(overburdened, can't move)`);
        leftCol.push(holding.padEnd(leftColWidth));
        const injuryCount = gj.playerInjuries[targetPid];
        if (injuryCount == 0) {
            leftCol.push(`${they} is uninjured.`);
        }
        else if (injuryCount == 1) {
            leftCol.push(`${they} has 1 injury. Capacity reduced by ${injuryCapReduction}.`)
        }
        else if (injuryCount > 1) {
            leftCol.push(`${they} has ${injuryCount} injuries.`);
        }

        const pLand = gj.getLandByPid(targetPid);
        const landPlosets = pLand.improvements.filter(imp => imp.craftName == 'ploset' && imp.hp > 0 && imp.owner == targetPid);
        if (landPlosets.length > 0) {
            let totalCapacity = 0;
            let spaceUsed = 0;
            landPlosets.forEach(ploset => {
                totalCapacity += closetCapacity;
                spaceUsed += closetCapacity - getClosetSpace(ploset);
            });
            leftCol.push(`Using ${spaceUsed}/${totalCapacity} ploset space here.`);
        }

        // Lands owned/if they're up for auctions
        const lands = gj.playerLands[targetPid];
        if (lands.length > 0) {
            leftCol.push(`Land Owned: ${lands.length}`);
            lands.forEach(plot => {
                const auction = gj.seasonAuctions.find(a => a.loc == plot.loc) ? '(!)' : '';
                leftCol.push(`  ${plot.loc}(${plot.terrain})${auction}(improvements: ${plot.improvements.length})`);
            });
        }

        // Trades offered
        if (theirTrades.length > 0) {
            belowRows.push("Trades Offered:" + theirTrades.length);
        }

    }
    else if (view == playersView) {

        let neighbors = [];
        let others = [];
        const thisPos = gj.playerPositions[pid];
        for (let i = 0; i < gj.playerNames.length; i++) {

            const pos = gj.playerPositions[i];
            let rdy = gj.metaPlans[i].ready ? '(rdy)' : '';
            let trd = gj.tradeOffers.find(trade => trade.pid == i && trade.available) ? '(?)' : '';

            if (i == pid) {
                leftCol.push("YOU:");
                leftCol.push(`${gj.playerNames[i]}`.padEnd(17, ".") + `at ${gj.getPlayerLoc(i)}${rdy}${trd}`);
                leftCol.push("");
            }
            else if (within1Move(pos, thisPos)) {
                neighbors.push(`${gj.playerNames[i]}`.padEnd(17, ".") + `at ${gj.getPlayerLoc(i)}${rdy}${trd}`);
            }
            else {
                others.push(`${gj.playerNames[i]}`.padEnd(17, ".") + `at ${gj.getPlayerLoc(i)}${rdy}${trd}`);
            }
        }

        leftCol.push("NEIGHBOR ZOTS:");
        neighbors.forEach(z => {
            leftCol.push(z);
        });
        if (neighbors.length == 0) leftCol.pop();
        else leftCol.push("");
        leftCol.push("FAR AWAY ZOTS:");
        others.forEach(z => {
            leftCol.push(z);
        });
        if (others.length == 0) leftCol.pop();
        if (others.length == 0 && neighbors.length == 0) leftCol.push("You are the only zot on Zearth.");
        else {
            leftCol.push("");
            leftCol.push("(?) means wants to trade");
            leftCol.push("(rdy) means ready for day");
        }
    }
    else if (view == landView) {
        // Show LVT due
        // Then show account details
        let totalLVT = gj.getPlayerLVT(pid);
        leftCol.push(`Total LVT: ${totalLVT}, due in ${gj.getDaysLeft()} days`);
        leftCol.push("");

        const balance = gj.getAccountBalance(pid);
        let stillDue = totalLVT - balance;
        if (stillDue < 0) stillDue = 0;
        leftCol.push(`Deposited(${balance}):`);
        const acc = gj.playerAccounts[pid];
        const pd = 5;
        const summary = `${acc.tobbles}t`.padStart(pd) + `${acc.nup}n`.padStart(pd)
                    + `${acc.wiggsies}w`.padStart(pd) + `${acc.getacles}g`.padStart(pd) 
                    + `${acc.moaf}m`.padStart(pd);
        leftCol.push(`${summary}`);
        if (gj.playerInventories[pid].debt > 0) leftCol.push(`(DEBT: ${gj.playerInventories[pid].debt}!)`);
        leftCol.push(``);
        leftCol.push("Plots You Own:");
        // Lands owned (taxView doubles as landsView)
        gj.playerLands[pid].forEach(plot => {
            // loc, terr, lvt, imp count
            leftCol.push(`${plot.loc}(${plot.terrain}), LVT: ${plot.lvt}`);
            if (plot.improvements.length > 0) {
                const impsOwned = plot.improvements.filter(imp => imp.owner == pid);
                impsOwned.forEach(imp => {
                    leftCol.push(`  ${imp.displayName} (${imp.hp} hp)`);
                    if (imp.details) {
                        let str = imp.details;
                        
                        const buffer = 4;
                        while (str.length > leftColWidth - buffer) {
                            const addDash = str.charAt(leftColWidth - (buffer + 1)) != ' ';
                            let slice = addDash ? str.substring(0, leftColWidth - buffer) + '-' : str.substring(0, leftColWidth - buffer);
                            leftCol.push(`  ` + slice)
                            str = addDash ? str.substring(leftColWidth - (buffer + 1)) : str.substring(leftColWidth - buffer);
                        }
                        leftCol.push(`  ` + str);
                    }
                });
            }
        });
        if (gj.playerLands[pid].length == 0) leftCol.push("(you don't own any plots)");

        const otherImps = gj.playerImprovements[pid].filter(imp => gj.getLandByLoc(imp.loc).owner != pid);
        if (otherImps.length > 0) {
            leftCol.push("");
            leftCol.push("Improvements On Unowned Plots:");
            otherImps.forEach(imp => {
                leftCol.push(`${imp.displayName} (${imp.hp} hp) at ${land.loc}(${land.terrain})`);
                if (imp.details) {
                    let str = imp.details;
                    const buffer = 4;
                    while (str.length > leftColWidth - buffer) {
                        const addDash = str.charAt(leftColWidth - (buffer + 1)) != ' ';
                        let slice = addDash ? str.substring(0, leftColWidth - buffer) + '-' : str.substring(0, leftColWidth - buffer);
                        leftCol.push(`  ` + slice)
                        str = addDash ? str.substring(leftColWidth - (buffer + 1)) : str.substring(leftColWidth - buffer);
                    }
                    leftCol.push(`  ` + str);
                }
            });
        }

    }
    else if (view == tradesView) {

        
        leftCol.push(`Traders must be within 1 plot.`);
        leftCol.push("Use 'offer' to create a trade.");
        leftCol.push("Use 'accept' to complete a trade.");
        leftCol.push(`Both cost ${tradeCost}e immediately.`);

        // Your trades
        let yourTrades = [];
        let closeTrades = [];
        let farTrades = [];
        let unavailableTrades = [];

        let i = 1;
        gj.tradeOffers.forEach(trade => {

            let msg = '';
            if (!trade.available) {
                // Skip it!
                unavailableTrades.push(`${i}. -unavailable-`);
            }
            else {
                msg = `${i}. OFFERED: `;

                if (trade.rentOffered) {
                    msg += `(rent ${trade.rentOffered.loc} ${trade.rentOffered.daysLeft} days) `;
                }

                for (let j = 0; j < trade.offered.length; j++) {
                    const numRes = trade.offered[j];
                    msg += `${numRes.quantity}${numRes.resCode} `;
                }
                msg += "FOR ";

                if (trade.rentWanted) {
                    msg += `(rent ${trade.rentWanted.loc} ${trade.rentWanted.daysLeft} days) `;
                }

                for (let j = 0; j < trade.wanted.length; j++) {
                    const numRes = trade.wanted[j];
                    msg += `${numRes.quantity}${numRes.resCode} `;
                }
                msg += `BY ${gj.playerNames[trade.pid]}`

                const tradeLand = gj.getLandByPid(trade.pid);
                if (trade.pid == pid) yourTrades.push(msg);
                else if (within1Move(tradeLand.pos, gj.getPos(pid))) closeTrades.push(msg);
                else farTrades.push(msg);
            }

            i++;
        });

        belowRows.push("YOUR OFFER:");
        yourTrades.forEach(t => {
            belowRows.push(t);
        });
        if (yourTrades.length == 0) belowRows.pop();
        else belowRows.push("");

        belowRows.push("NEARBY TRADES:");
        closeTrades.forEach(t => {
            belowRows.push(t);
        });
        if (closeTrades.length == 0) belowRows.pop();
        else belowRows.push("");

        belowRows.push("FARAWAY TRADES:");
        farTrades.forEach(t => {
            belowRows.push(t);
        });
        if (farTrades.length == 0) belowRows.pop();
        else belowRows.push("");

        if (unavailableTrades.length > 0) {
            belowRows.push("UNAVAILABLE TRADES:");
            unavailableTrades.forEach(t => {
                belowRows.push(t);
            });
        }
    }
    else if (view == normalView) {
        
        const inv = gj.playerInventories[pid];
        const invCount = gj.getPlayerInventoryCount(pid);

        if (land == gj.getLandByPid(pid)) {
            const itCount = gj.playerInventories[pid].items.length;
            leftCol.push(`You have ${itCount} ` + (itCount == 0 || itCount > 1 ? `items` : `item`));
            leftCol.push(`You have ${invCount}/${gj.getCapacity(pid)} resources`);
            if (invCount > gj.getCapacity(pid)) {
                 leftCol.push("(overburdened, can't move)");
            }
            const injuryCount = gj.playerInjuries[pid];
            if (injuryCount == 1) {
                leftCol.push(`You have 1 injury (-${injuryCapReduction} capacity)`);
            }
            else if (injuryCount > 1) {
                leftCol.push(`You have ${injuryCount} injuries (-${injuryCapReduction * injuryCount} capacity)`);
            }
            else leftCol.push(`You have no injuries`);
        }
        else {
            const pos = gj.playerPositions[pid];
            const minDistance = Math.max(Math.abs(pos[0] - land.pos[0]), Math.abs(pos[1] - land.pos[1]));
            leftCol.push(`Your min distance to ${land.loc} is ${minDistance}.`);
        }
        leftCol.push("");

        const invPad = 6;
        const rPad = 5;
        const srcPd = 3;
        const reses = land.revealed ? `${land.loc}(${land.terrain})` : `${land.loc}(?)`;

        leftCol.push("You |".padStart(invPad + 10) + reses.padStart(rPad + 1));

        if (land.revealed) {

            leftCol.push(`tobbles:`.padEnd(10)  + `${inv.tobbles}t |`.padStart(invPad)   + `${land.resources.tobbles}t`.padStart(rPad));
            leftCol.push(`nup:`.padEnd(10)      + `${inv.nup}n |`.padStart(invPad)       + `${land.resources.nup}n`.padStart(rPad));
            leftCol.push(`wiggsies:`.padEnd(10) + `${inv.wiggsies}w |`.padStart(invPad)  + `${land.resources.wiggsies}w`.padStart(rPad));
            leftCol.push(`getacles:`.padEnd(10) + `${inv.getacles}g |`.padStart(invPad)  + `${land.resources.getacles}g`.padStart(rPad));
            leftCol.push(`moaf:`.padEnd(10)     + `${inv.moaf}m |`.padStart(invPad)      + `${land.resources.moaf}m`.padStart(rPad));
        }
        else {
            leftCol.push(`tobbles:`.padEnd(10)  + `${inv.tobbles}t |`.padStart(invPad)   + `?t`.padStart(rPad));
            leftCol.push(`nup:`.padEnd(10)      + `${inv.nup}n |`.padStart(invPad)       + `?n`.padStart(rPad));
            leftCol.push(`wiggsies:`.padEnd(10) + `${inv.wiggsies}w |`.padStart(invPad)  + `?w`.padStart(rPad));
            leftCol.push(`getacles:`.padEnd(10) + `${inv.getacles}g |`.padStart(invPad)  + `?g`.padStart(rPad));
            leftCol.push(`moaf:`.padEnd(10)     + `${inv.moaf}m |`.padStart(invPad)      + `?m`.padStart(rPad));
        }

        leftCol.push(``);
        const owner = land.owner >= 0 ? gj.playerNames[land.owner] : "unowned";
        leftCol.push(`Owned by: ${owner}, LVT: ${land.lvt}`);
        const auction = gj.seasonAuctions.find(a => a.loc == land.loc);
        if (auction) {
            const bid = auction.bids.find(b => b.pid == pid);
            if (bid) leftCol.push(`Auction ongoing. You bid: ${bid.amt}.`);
            else leftCol.push(`Auction ongoing. You have not bid.`);
        }
        leftCol.push(``);
        leftCol.push(`Improvements:` );
        land.improvements.forEach(imp => {
            leftCol.push(`${imp.displayName}`.substring(0, leftColWidth - 8) + `(${imp.hp} hp)`);
            leftCol.push("  owner: " + gj.playerNames[imp.owner]);
            if (imp.details) {
                let str = imp.details;
                const buffer = 4;
                while (str.length > leftColWidth - buffer) {
                    const addDash = str.charAt(leftColWidth - buffer) != ' ';
                    let slice = addDash ? str.substring(0, leftColWidth - buffer - 1) + '-' : str.substring(0, leftColWidth - buffer);
                    leftCol.push(`  ` + slice)
                    str = addDash ? str.substring(leftColWidth - buffer - 1) : str.substring(leftColWidth - buffer);
                }
                leftCol.push(`  ` + str);
            }
        });
        if (land.improvements.length == 0) leftCol.push("-no improvements on plot-");

        

        const landPlosets = land.improvements.filter(imp => imp.craftName == 'ploset' && imp.hp > 0 && imp.owner == pid);
        if (landPlosets.length > 0) {
            let totalCapacity = 0;
            let spaceUsed = 0;
            landPlosets.forEach(ploset => {
                totalCapacity += closetCapacity;
                spaceUsed += closetCapacity - getClosetSpace(ploset);
            });
            leftCol.push(`Using ${spaceUsed}/${totalCapacity} ploset space here.`);
        }

        middleCol.push(`Features of ${land.loc}(${land.revealed ? land.terrain : '?'}):`);
        if (land.revealed) {
            middleCol.push(`${land.sources.tobblerone}`.padStart(srcPd) + ` tobblerone`);
            middleCol.push(`${land.sources.nupfields}`.padStart(srcPd) + ` nupfields`);
            middleCol.push(`${land.sources.wigroot}`.padStart(srcPd) + ` wigroot`);
            middleCol.push(`${land.sources.getnests}`.padStart(srcPd) + ` get nests`);
            middleCol.push(`${land.sources.moafpits}`.padStart(srcPd) + ` moaf pits`);
        }
        else {
            middleCol.push(`?`.padStart(srcPd) + ` tobblerone`);
            middleCol.push(`?`.padStart(srcPd) + ` nupfields`);
            middleCol.push(`?`.padStart(srcPd) + ` wigroot`);
            middleCol.push(`?`.padStart(srcPd) + ` get nests`);
            middleCol.push(`?`.padStart(srcPd) + ` moaf pits`);
        }

        rightCol.push("");
        rightCol.push(`Zots On Plot:`);
        if (land.playerIds.length > 0) {
            land.playerIds.forEach(id => {
                const trade = (gj.tradeOffers.find(t => t.pid == id && t.available));
                const tr = (trade && trade.available) ? `(?)` : ''; 
                const rdy = gj.metaPlans[id].ready ? `(rdy)` : ``;
                rightCol.push(`${gj.playerNames[id]} ${tr}${rdy}`);
            });
        }
        else rightCol.push("-no zots on plot-");
    }

    // Actually would like to force map col width to be mobile min maybe... idk
    const mapColWidth = Math.max(24, 2 + 1 + gj.mapSize[0] * 4 + 3);
    const mapColHeight = gj.mapSize[1] + (gj.playerPositions[pid] == gj.playerPlannedPositions[pid] ? 4 : 5);

    let zearth = '';
    if (mapColWidth > 13) {
        zearth = "Map Of Zearth".padStart(Math.round(mapColWidth / 2 + 6)).padEnd(mapColWidth);
    }
    else zearth = "Map Of Zearth"; // 13 chars

    const daysLeft = gj.taxSeason - (gj.dayCount - gj.lastSeasonDate) + 1;
    const remaining = Math.floor((gj.secondsPerDay * 1000 - gj.dayClock) / 1000);
    const timeOfDay = `${remaining} sec til Day ${gj.dayCount}` + (gj.isPaused ? ' (paused)' : '');

    //let currentEnergy = gj.playerLands[pid].length > 0 ? `${gj.playerLands[pid].length} plots owned` : "no plots owned";
    const injects = gj.playerInventories[pid].items.filter(it => it.craftName == 'inject').length;
    const drops = gj.playerInventories[pid].items.filter(it => it.craftName == 'droplet').length;
    const currentEnergy = `inj:${injects}  drps:${drops}  e:${gj.playerEnergies[pid]}/${gj.getMaxEnergy(pid)}`;
    
    let screen = `${timeOfDay}`.padEnd(leftColWidth) + zearth + currentEnergy.padStart(rightColWidth);
    
    const seasonCount = Math.floor(gj.dayCount / gj.taxSeason) + 1;
    const tilSeason = `${daysLeft} days til Season ${seasonCount}`.padEnd(leftColWidth);
    const subtitle = (view == auctionView) ? "ongoing auctions" : "type '?' for help"; // 16 and 17 char respectively
    const auctionHeader = subtitle.padStart(Math.round(mapColWidth / 2 + 8)).padEnd(mapColWidth);
    
    const lvtDue = gj.getPlayerLVT(pid);
    const lvtMsg = lvtDue > 0 ? `LVT is ${lvtDue}` : "no LVT due"; 
    screen += '\n';
    screen += tilSeason + auctionHeader + lvtMsg.padStart(rightColWidth);
    
    const max = Math.max(mapColHeight + middleCol.length, leftCol.length, rightCol.length)
    while (leftCol.length < max) leftCol.push('');
    while (mapColHeight + middleCol.length < max) middleCol.push('');
    while (rightCol.length < max) rightCol.push('');

    const screenHeight = max + belowRows.length;

    let i = 0; 
    while (i < screenHeight) {
        let row = '';

        if (i < max){
            row += leftCol[i].padEnd(leftColWidth);

            if (i < mapColHeight) {
                let yMap = gj.mapSize[1] - i;
                row += getMapRow(gj, pid, yMap, targetPid, view).padEnd(mapColWidth);
            }
            else {
                row += middleCol[i - mapColHeight].padEnd(mapColWidth);
            }

            row += rightCol[i];
        }
        else row += belowRows[i - max];

        screen += `\n` + row;
        i++;
    }

    return screen;
}


function getMapRow(gj, pid, y, otherPid, view) {

    let showPlanPos = equalArray(gj.playerPositions[pid], gj.playerPlannedPositions[pid]) == false;

    if (y == gj.mapSize[1]) {
        // Space for column and then one _, then 4 x width
        return `  _` + "_".repeat(gj.mapSize[0] * 4);
    }
    else if (y == -1) {
        let row = "  "; // Shift over 2 spaces for row numbers
        for (let i = 0; i < gj.mapSize[0]; i++) {
            row += '  ' + String.fromCharCode(64 + i + 1).toLowerCase() + ' ';
        }
        return row;
    }
    else if (y == -2) {
        if (view == auctionView) return ` $: auction ongoing`;
        else return ` @: you (${gj.getPlayerLoc(pid)})`;
    }
    else if (y == -3) {
        if (view == auctionView) return ` !: you own plot`;
        else if (view == tradesView) {
            if (showPlanPos) {
                return ` ${plannedPosIcon}: planned (${vecToLoc(gj.playerPlannedPositions[pid])})`;
            }
            else return ` ?: trade offered`;
        }
        else if (otherPid >= 0) return ` ${gj.playerNames[otherPid].charAt(0)}: ${gj.playerNames[otherPid]}(${gj.getPlayerLoc(otherPid)})`;
        else {
            if (showPlanPos) {
                return ` ${plannedPosIcon}: planned (${vecToLoc(gj.playerPlannedPositions[pid])})`;
            }
            else return ` z: other zots`;
        }
    }
    else if (y == -4) {
        if (view == tradesView) {
            if (showPlanPos) return ` ?: trade offered`;
            else return ` z: zots not trading`;
        }
        else if (showPlanPos) {
            return ` z: other zots`;
        }
        else return '';
    }
    else if (y < -4) return '';

    //////////////////////////////////

    let row = ` ${y + 1}|`;

    const pLand = gj.getLandByPid(pid);
    const planLand = showPlanPos ? gj.getLandAtPos(gj.playerPlannedPositions[pid]) : null;
    // Moving left to right
    for (let i = 0; i < gj.mapSize[0]; i++) {
        const land = gj.map[i][y];

        if (otherPid >= 0) {
            const char = gj.playerNames[otherPid].charAt(0);
            if (pLand == land) {
                if (land.playerIds.includes(otherPid)) row += char;
                else row += land.playerIds.length > 1 ? 'z' : '_';
                row += (land.revealed? land.terrain : '_') + '@|';
            }
            else {
                if (land.playerIds.includes(otherPid)) row += char;
                else row += land.playerIds.length > 1 ? 'z' : '_';
                row += (land.revealed? land.terrain : '_');
                row += (land == planLand) ? `${plannedPosIcon}|` : '_|';
            }
        }
        else if (view == auctionView) {
            const auction = gj.seasonAuctions.find(a => a.loc == land.loc);
            if (auction) {
                row += '$';
                row += land.revealed? land.terrain : '_';
                row += land.owner == pid ? "!|" : "_|";
            }
            else {
                row += '_';
                row += land.revealed? land.terrain : '_';
                if (land.owner == pid) row += "!|";
                else row += (land == planLand) ? `${plannedPosIcon}|` : '_|';
            }
        }
        else if (view == tradesView) {
            const trade = gj.tradeOffers.find(t => gj.getLandByPid(t.pid) == land && t.available);
            if (trade) {
                row += '?';
                row += land.revealed? land.terrain : '_';
                row += land == pLand ? "@|" : "_|";
            }
            else if (pLand == land) {
                row += land.playerIds.length > 1 ? 'z' : '_';
                row += (land.revealed? land.terrain : '_') + '@|';
            }
            else {
                row += land.playerIds.length > 0 ? 'z' : '_';
                row += (land.revealed? land.terrain : '_');
                row += (land == planLand) ? `${plannedPosIcon}|` : '_|';
            }
        }
        // Normal view/all others
        else {
            if (pLand == land) {
                row += land.playerIds.length > 1 ? 'z' : '_';
                row += (land.revealed? land.terrain : '_') + '@|';
            }
            else {
                row += land.playerIds.length > 0 ? 'z' : '_';
                row += (land.revealed? land.terrain : '_');
                row += (land == planLand) ? `${plannedPosIcon}|` : '_|';
            }
        }
    }

    return row;
}