import { getRandomElement, getRandomInt, shuffleArray, vecToLoc } from "./helpers.js";
import { addToCurrentInbox, logDEBUG, logWarning, readCurrentInboxMail } from "./output.js";

export const resCodeToResName = new Map();
resCodeToResName.set('t',           'tobbles');
resCodeToResName.set('tobbles',     'tobbles');
resCodeToResName.set('n',           'nup');
resCodeToResName.set('nup',         'nup');
resCodeToResName.set('w',           'wiggsies');
resCodeToResName.set('wiggsies',    'wiggsies');
resCodeToResName.set('g',           'getacles');
resCodeToResName.set('getacles',    'getacles');
resCodeToResName.set('m',           'moaf');
resCodeToResName.set('moaf',        'moaf');

export const resNameToCode = new Map();
resNameToCode.set('t',           't');
resNameToCode.set('tobbles',     't');
resNameToCode.set('n',           'n');
resNameToCode.set('nup',         'n');
resNameToCode.set('w',           'w');
resNameToCode.set('wiggsies',    'w');
resNameToCode.set('g',           'g');
resNameToCode.set('getacles',    'g');
resNameToCode.set('m',           'm');
resNameToCode.set('moaf',        'm');


export const resCodes = ['t', 'n', 'w', 'g', 'm'];

export const laborers = ['george','henry','janning','albertjaynock','tolstoy','huxley','shen','theredace','hodor-kun',
                                'alannah','buckley','hoskins','rizzo','mollineaux','gwartney','gaffney','marx','adamsmith','quesnay',
                                'malthus','mill','friedman','feynman','keller','einstein','franklin','jefferson','sue','josh','ricardo',
                                'nohomeeconomist','gabu','ian','jamal','warbler'];




export const mobile_width = 34;

export const desertCost = 5;
export const grassCost = 5;
export const forestCost = 10;
export const oceanCost = 25;
export const mountainCost = 50;

export const squareEnergy = 30;

export const moveCost = '?';
export const tradeCost = 1;
export const craftCost = 15;
export const gatherCost = 10;
export const speakCost = 1;
export const bidCost = 2;
export const shoutCost = 10;
export const seizureCost = 5;
export const seizureDepreciation = 5;
export const attackCost = 100;

export const injuryCapReduction = 10;
export const backbagCapacity = 20;
export const minGather = 1;
export const maxGather = 6;
export const netMin = 1;
export const netMax = 6;

export const botGathMin = 1;
export const botGathMax = 6;

export const capacityPerArm = 50;
export const energyPerLung = 50;

export const rodCraftName = 'tobblerod';
export const getagetsName = 'getagets';
export const hoverboardName = 'hoverboard';
export const jumpName = 'jumpoline';
export const hammerName = 'whammer';
export const injectEnergy = 40;
export const whammerReduction = 5;
export const closetCapacity = 50;
export const toolWear = 5;

export const hoverboardWear = 20;

export const grassTerrain       = '÷';
export const forestTerrain      = 'Ұ';//↟;
export const oceanTerrain       = 'o';//≋;
export const mountainTerrain    = '∧';//◮;
export const desertTerrain      = '.';//˷;
export const plannedPosIcon     = '√';
export const tradeIcon          = '?';

export const move_title = "Move:";
export const gather_title = "Gather:";
export const craft_title = "Craft:";


const villageTerrain = [ grassTerrain, desertTerrain, forestTerrain, oceanTerrain, mountainTerrain]

export const closetName = 'ploset';


export function shapeLand(terrainCode) {
    // grass, forest, ocean, mountain, desert
    // idk what tobbles/nup/wiggsies/getacles and moaf are
    let earthShaping;
    if (terrainCode == grassTerrain) {
        earthShaping = {
            tobblerone: getRandomInt(2, 4),
            nupfields: getRandomInt(5, 11),
            wigroot: getRandomInt(10, 21),
            getnests: 0,
            moafpits: 0
        };
    }
    else if (terrainCode == forestTerrain) {
        earthShaping = {
            tobblerone: getRandomInt(16, 32),
            nupfields: Math.random() > .2 ? 1 : 0,
            wigroot: getRandomInt(1, 3),
            getnests: getRandomInt(1, 4),
            moafpits: Math.random() > .8 ? getRandomInt(1, 2) : 0,
        };
    }
    else if (terrainCode == oceanTerrain) {
        earthShaping = {
            tobblerone: 0,
            nupfields: 0,
            wigroot: getRandomInt(1, 3),
            getnests: getRandomInt(5, 11),
            moafpits: getRandomInt(0, 2)
        };
    }
    else if (terrainCode == mountainTerrain) {
        earthShaping = {
            tobblerone: getRandomInt(0, 13),
            nupfields: 0,
            wigroot: getRandomInt(2, 6),
            getnests: 0,
            moafpits: getRandomInt(10, 21)
        };
    }
    else if (terrainCode == desertTerrain) {
        earthShaping = {
            tobblerone: Math.random() > .8 ? getRandomInt(3, 5) : 0,
            nupfields: Math.random() > .8 ? 1 : 0,
            wigroot: Math.random() > .8 ? getRandomInt(1, 3) : 0,
            getnests: Math.random() > .8 ? getRandomInt(3, 5) : 0,
            moafpits: Math.random() > .8 ? getRandomInt(3, 5) : 0,
        };
    }
    else {
        logWarning("unhandled terrain '" + terrainCode + "'.");
        earthShaping = {
            tobblerone: 0,
            nupfields: 0,
            wigroot: 0,
            getnests: 0,
            moafpits: 0
        };
    }


    return earthShaping;
}

export function getTerrainMovementCost(terrain) {
    switch (terrain) {
        case grassTerrain:
            return grassCost;
        case forestTerrain:
            return forestCost;
        case oceanTerrain:
            return oceanCost;
        case mountainTerrain:
            return mountainCost;
        case desertTerrain:
            return desertCost;
        default:
            logWarning("unhandled terrain: " + terrain);
            return grassCost;
    }
}

export function bloom(land, firstBloom, overrideTerrain) {
    
    if (overrideTerrain) {
        land.terrain = overrideTerrain;
        land.revealed = true;
        shapeLand(land);
    }

    // Caching
    const sources = land.sources;
    const resources = land.resources;

    // Reliable tobble production
    resources.tobbles = sources.tobblerone * 2;
    resources.getacles = sources.getnests * 2;
    resources.moaf = sources.moafpits * 2;

    
    // Wiggsies are high variance
    resources.wiggsies = sources.wigroot * getRandomInt(1, 20);

    if (firstBloom) {
        resources.nup = getRandomInt(sources.nupfields * 5, sources.nupfields * 10);
    }
    resources.nup = resources.nup * 2;
    if (resources.nup > sources.nupfields * 10) resources.nup = sources.nupfields * 20;
    if (resources.nup < sources.nupfields) resources.nup = sources.nupfields;
}

export function getResourceInfo(land, code) {
    
    let info = { name: "", amount: 0};
    if (!land) {
        logWarning("null land");
        return;
    }
    switch (code) {
        case 't':
            info.name = "tobbles";
            info.amount = land.resources.tobbles;
            break;
        case 'n':
            info.name = "nup";
            info.amount = land.resources.nup;
            break;
        case 'w':
            info.name = "wiggsies";
            info.amount = land.resources.wiggsies;
            break;
        case 'g':
            info.name = "getacles";
            info.amount = land.resources.getacles;
            break;
        case 'm':
            info.name = "moaf";
            info.amount = land.resources.moaf;
            break;
        default:
            logWarning("unhandled resource code: " + code);
            break;
    }

    return info;
}

export function getClosetSpace(closet) {
    return closetCapacity - (closet['t'] + closet['n'] + closet['w'] + closet['g'] + closet['m']);
}

export function printClosetDetails(closet) {
    return `${closet['t']}t, ${closet['n']}n, ${closet['w']}w, ${closet['g']}g, ${closet['m']}m (using: ${closetCapacity - getClosetSpace(closet)}/${closetCapacity})`;
}

export function changeLandResources(land, code, amount) {
    if (!land) {
        logWarning("null land");
        return;
    }
    switch (code) {
        case 't':
            land.resources.tobbles += amount;
            break;
        case 'n':
            land.resources.nup += amount;
            break;
        case 'w':
            land.resources.wiggsies += amount;
            break;
        case 'g':
            land.resources.getacles += amount;
            break;
        case 'm':
            land.resources.moaf += amount;
            break;
        default:
            logWarning("unhandled resource code: " + code);
            break;
    }
}

export function changePlayerResources(inventory, code, amount) {
    if (!inventory) {
        logWarning("null assets");
        return;
    }
    switch (code) {
        case 't':
            inventory.tobbles += amount;
            break;
        case 'n':
            inventory.nup += amount;
            break;
        case 'w':
            inventory.wiggsies += amount;
            break;
        case 'g':
            inventory.getacles += amount;
            break;
        case 'm':
            inventory.moaf += amount;
            break;
        default:
            logWarning("unhandled resource code: " + code);
            break;
    }
}

export function getInvRes(inventory, code) {
    if (!inventory) {
        logWarning("null assets");
        return;
    }
    switch (code) {
        case 't':
            return inventory.tobbles;
        case 'n':
            return inventory.nup;
        case 'w':
            return inventory.wiggsies;
        case 'g':
            return inventory.getacles;
        case 'm':
            return inventory.moaf;
        default:
            logWarning("unhandled resource code: " + code);
            return 0;
    }
}

export function listCrafts() {
    let str = '';
    return str;
}


export const tech = [{ 
    displayName:        'inject',
    craftName:          'inject',
    shortDescription:   `consume for ${injectEnergy}e`,
    description:        `Provides ${injectEnergy} energy, but will not exceed your energy capacity.`
                        + ` An inject only has 5hp, therefore it depreciates in 5 days under normal circumstances.`,
    lore:               'For zots on the go!',
    unique:             false,
    hp:                 5,
    isLandImprovement:  false,
    tobbles:            0,
    nup:                0,
    wiggsies:           2,
    getacles:           0,
    moaf:               0
}, {
    displayName:        'droplet',
    craftName:          'droplet',
    shortDescription:   'consume to heal 1 injury',
    description:        `Heals injuries. Each injury reduces your capacity to carry resources while moving by ${injuryCapReduction}.`
                        + ` A droplet only has 5hp, therefore it depreciates in 5 days under normal circumstances.`,
    lore:               `The underlying mechanisms are not well understood, but wise zots will never travel without their drops!`,
    unique:             false,
    hp:                 5,
    isLandImprovement:  false,
    tobbles:            0,
    nup:                1,
    wiggsies:           0,
    getacles:           0,
    moaf:               0
}, {
    displayName:        'wiggy vac',
    craftName:          'wiggyvac',
    shortDescription:   `+${minGather} to ${maxGather} more 'w' when gathering`,
    description:        `A tool for vacuuming wiggies. You'll gather ${minGather} to ${maxGather} more per vac. It has 100 hp, but depreciates ${toolWear}hp upon use.`,
    lore:               'It took a zot a lot of mental exertion and a lot of destroyed wiggsies to perfect this vacuum.',
    unique:             false,
    hp:                 100,
    isLandImprovement:  false,
    tobbles:            4,
    nup:                4,
    wiggsies:           0,
    getacles:           0,
    moaf:               0
}, {
    displayName:        'tobble rod',
    craftName:          rodCraftName,
    shortDescription:   `+${minGather} to ${maxGather} more 't' when gathering`,
    description:        `A tool for attracing wiggies. You'll gather ${minGather} to ${maxGather} more per rod. It has 100 hp, but depreciates ${toolWear}hp upon use.`,
    lore:               'It was just another freak accident of zistory that a zot discovered that tobbles have a strong attraction to wiggsy-infused nup.',
    unique:             false,
    hp:                 100,
    isLandImprovement:  false,
    tobbles:            0,
    nup:                4,
    wiggsies:           4,
    getacles:           0,
    moaf:               0
}, {
    displayName:        'whammer',
    craftName:          'whammer',
    shortDescription:   `-${whammerReduction}e crafting cost, -${toolWear}hp on use`,
    description:        `When crafting, reduces energy cost by ${whammerReduction}. It has 200 hp, depreciates ${toolWear} hp upon use. Up to two used at a time.`,
    lore:               'A bag of these is very useful for a crafty zot.',
    unique:             false,
    hp:                 200,
    isLandImprovement:  false,
    tobbles:            10,
    nup:                0,
    wiggsies:           0,
    getacles:           1,
    moaf:               1
}, {
    displayName:        'hoverboard',
    craftName:          'hoverboard',
    shortDescription:   `cuts movement cost in half, not on ${mountainTerrain}`,
    description:        `Hoverboarding costs movement cost in half, but not through ${mountainTerrain} terrain. It has 60 hp, but depreciates ${hoverboardWear} upon use.`
                        + ` One hoverboard will be used at at time when processing each move.`,
    lore:               'It is difficult to relate how cool zots are when riding upon this.',
    unique:             false,
    hp:                 60,
    isLandImprovement:  false,
    tobbles:            5,
    nup:                0,
    wiggsies:           0,
    getacles:           5,
    moaf:               0
},  
{
    displayName:        'jumpoline',
    craftName:          'jumpoline',
    shortDescription:   `single-use free move into ${mountainTerrain}`,
    description:        `A single-use free pass into ${mountainTerrain} terrain. It has 60 hp, but depreciates fully on use.`,
    lore:               `Jump. Jump. Jump around.`,
    unique:             false,
    hp:                 60,
    isLandImprovement:  false,
    tobbles:            0,
    nup:                5,
    wiggsies:           0,
    getacles:           10,
    moaf:               0
}, 
{
    displayName:        'backbag',
    craftName:          'backbag',
    shortDescription:   `+${backbagCapacity} to carry capacity`,
    description:        'Can carry more resources while moving. It has 15 hp. Backbags can stack.',
    lore:               'Zots like to hold a lot of stuff.',
    unique:             false,
    hp:                 15,
    isLandImprovement:  false,
    tobbles:            0,
    nup:                5,
    wiggsies:           0,
    getacles:           1,
    moaf:               0
},{
    displayName:        'extra arm',
    craftName:          'extraarm',
    shortDescription:   `+${capacityPerArm} to carry capacity (unique)`,
    description:        `Near-permanent, unique item (can only have 1 of it). I mean, you can have your normal arm, an extra arm, and a third arm. Increases carrying capacity by ${capacityPerArm} and will last 999 days.`,
    lore:               'A zot can only have one extra arm, but boy is it handy!',
    unique:             true,
    hp:                 999,
    isLandImprovement:  false,
    tobbles:            1,
    nup:                1,
    wiggsies:           1,
    getacles:           1,
    moaf:               0
}, {
    displayName:        'third arm',
    craftName:          'thirdarm',
    shortDescription:   `+${capacityPerArm} to carry capacity (unique)`,
    description:        `Near-permanent, unique item (can only have 1 of it). I mean, you can have your normal arm, an extra arm, and a third arm. Increases carrying capacity by ${capacityPerArm} and will last 999 days.`,
    lore:               'A zot can only have one extra arm, but boy is it handy!',
    unique:             true,
    hp:                 999,
    isLandImprovement:  false,
    tobbles:            20,
    nup:                20,
    wiggsies:           20,
    getacles:           20,
    moaf:               0
},
{
    displayName:        'extra lung',
    craftName:          'extralung',
    shortDescription:   `+${energyPerLung}e max energy (unique)`,
    description:        `Near-permanent, unique item (can only hold 1 of it). Increases energy energy capacity by ${energyPerLung}e. Lasts 999 days. You can have the lung you're born with, an extra lung, and a third lung. No more.`,
    lore:               'Zots have an outrageous V02 max.',
    unique:             true,
    hp:                 999,
    isLandImprovement:  false,
    tobbles:            1,
    nup:                1,
    wiggsies:           1,
    getacles:           0,
    moaf:               1
}, 
{
    displayName:        'third lung',
    craftName:          'thirdlung',
    shortDescription:   `+${energyPerLung}e max energy (unique)`,
    description:        `Near-permanent, unique item (can only hold 1 of it). Increases energy energy capacity by ${energyPerLung}e. Lasts 999 days. You can have the lung you're born with, an extra lung, and a third lung. No more.`,
    lore:               'Zots have an outrageous V02 max.',
    unique:             true,
    hp:                 999,
    isLandImprovement:  false,
    tobbles:            10,
    nup:                10,
    wiggsies:           10,
    getacles:           0,
    moaf:               5
},
{
    displayName:        'laser eye',
    craftName:          'lasereye',
    shortDescription:   '+500 attack (unique)',
    description:        'Light amplification by stimulated emission of radiation. From your eye. Near-permanent.',
    lore:               'The extra eye of a zot is quite powerful.',
    unique:             true,
    hp:                 999,
    isLandImprovement:  false,
    tobbles:            0,
    nup:                0,
    wiggsies:           500,
    getacles:           80,
    moaf:               20
}, 

//////////// improvements

{
    displayName:        'energy square',
    craftName:          'energysquare',
    shortDescription:   `+${squareEnergy}e when rested upon`,
    description:        `This is a land improvement. It has 15 hp. When rested upon at end of day, provides extra ${squareEnergy} energy.`,
    lore:               'Some zots prefer hard squares, others soft. It is very special if a zot shares their square with you.',
    unique:             false,
    hp:                 15,
    isLandImprovement:  true,
    loc:                null,
    owner:              -1,
    tobbles:            2,
    nup:                2,
    wiggsies:           0,
    getacles:           0,
    moaf:               0
}, {
    displayName:        'ploset',
    craftName:          'ploset',
    shortDescription:   `stash up to ${closetCapacity} resources`,
    description:        `This is a land improvement. It has 15 hp. Can stash ${closetCapacity} resources here. Lasts 10 days. There's no repairing in this game.`
                        + ` When a ploset cumbles (reaches 0 hp), its contents will be automatically stashed in any`
                        + ` ploset on the same land that hasn't crumbled. Build plosets to replace old plosets.`,
    lore:               "Technically a preservation closet.",
    unique:             false,
    hp:                 15,
    isLandImprovement:  true,
    loc:                null,
    owner:              -1,
    tobbles:            3,
    nup:                3,
    wiggsies:           0,
    getacles:           0,
    moaf:               0,
    't':                0,
    'n':                0,
    'w':                0,
    'g':                0,
    'm':                0,
    details:            `(0/${closetCapacity})`,
}, {
    displayName:        'entroset',
    craftName:          'entroset',
    shortDescription:   'stash items, halts depreciation',
    description:        `This is a land improvement. It has 15 hp. Items inside do not depreciate, but the entroset depreciates as normal. It lasts 10 days. There's no repairing in this game.`
                        + ` When an entroset cumbles (reaches 0 hp), its contents will be automatically stashed in any`
                        + ` entroset on the same land that hasn't crumbled. Build an entroset to replace an old entroset.`
                        + ` With entrosets, you only need one per plot, since they do not have a limit on how many items they can hold.`,
    lore:               "There is disagreement among zot scholars about what entropy is and how an etroset retards its effects.",
    unique:             false,
    hp:                 15,
    isLandImprovement:  true,
    loc:                null,
    owner:              -1,
    tobbles:            3,
    nup:                3,
    wiggsies:           0,
    getacles:           3,
    moaf:               0,
    items:              []
}, {
    displayName:        'nup net',
    craftName:          'nupnet',
    shortDescription:   `auto gathers 'n', needs ploset`,
    description:        `This is a land improvement. It has 10 hp. Requires owned ploset on same plot to store nup. Automatically gathers ${netMin} to ${netMax} nup each day.`,
    lore:               "Netting nup is a time-honored tradition among the zot.",
    unique:             false,
    hp:                 10,
    isLandImprovement:  true,
    loc:                null,
    owner:              -1,
    tobbles:            3,
    nup:                0,
    wiggsies:           3,
    getacles:           3,
    moaf:               0,
    count:              0,
}, {
    displayName:        `${getagetsName}`,
    craftName:          `${getagetsName}`,
    shortDescription:   `auto gathers 'g', needs ploset`,
    description:        `This is a land improvement. It has 10 hp. Requires owned ploset on same plot to store nup. Automatically gathers ${botGathMin} to ${botGathMax} getacles each day.`,
    lore:               "Getacle-pickers were not upset at the advent of get-a-gets, since they knew all zots would benefit from such labor-saving devices through the LVT.",
    unique:             false,
    hp:                 10,
    isLandImprovement:  true,
    loc:                null,
    owner:              -1,
    tobbles:            3,
    nup:                3,
    wiggsies:           3,
    getacles:           0,
    moaf:               0,
    count:              0,
}, 
{
    displayName:        'bio fence',
    craftName:          'biofence',
    shortDescription:   'prevents gathering by others',
    description:        'This is a land improvement. It has 15 hp. The biometric fence scans would-be gatherers or improvement crafters to see if they have been approved. Owner of the plot is always approved.'
                        +' Owners can grant other zots approval via trading. Preexisting land improvements built by non-owners will continue to run.',
    lore:               'Some zots want their privacy.',
    unique:             false,
    hp:                 15,
    isLandImprovement:  true,
    tobbles:            1,
    nup:                0,
    wiggsies:           0,
    getacles:           0,
    moaf:               0,
}, 
// {
//     displayName:        'pulpit',
//     craftName:          'pulpit',
//     shortDescription:   'allows trading for reduced energy cost',
//     description:        `This is a land improvement. Trades offered and accepted here only use ${pulpitCost} energy.`,
//     lore:               "The high traders in the zoot are viewed with a mystic reverance.",
//     unique:             false,
//     hp:                 10,
//     isLandImprovement:  true,
//     owner:              -1,
//     tobbles:            10,
//     nup:                10,
//     wiggsies:           0,
//     getacles:           0,
//     moaf:               5,
// }, 
// {
//     displayName:        'xerox',
//     craftName:          'xerox',
//     shortDescription:   `when crafting in this facility, ${xeroxChance}% chance to create a duplicate`,
//     description:        `This is a land improvement. When crafting is performed here, if the item of technology is not a land improvement,`
//                         + ` there is a ${xeroxChance}% chance that two of the desired item are produced`
//                         + `for the same resource and energy cost as one. Depreciates ${xeroxWear} hp upon use. Can stack.`,
//     lore:               ".",
//     unique:             false,
//     hp:                 10,
//     isLandImprovement:  true,
//     owner:              -1,
//     tobbles:            10,
//     nup:                10,
//     wiggsies:           0,
//     getacles:           100,
//     moaf:               20,
// }, 
{
    displayName:        'conflict resolver',
    craftName:          'conflictresolver',
    shortDescription:   'auto attacks attackers',
    description:        'This is a land improvement. It has 100 hp. Resolves violent conflicts on plot of land. Targets initiator. Depreciates dramatically upon use.',
    lore:               'Zots do not look kindly on land claimers.',
    unique:             false,
    hp:                 100,
    isLandImprovement:  true,
    loc:                null,
    owner:              -1,
    tobbles:            30,
    nup:                30,
    wiggsies:           8,
    getacles:           15,
    moaf:               1
}, {
    displayName:        'puppy',
    craftName:          'puppy',
    shortDescription:   'a small creature that makes you happy',
    description:        'A small, cute, furry creature that makes you happy. It has 30 hp.',
    lore:               'Zots delight in other lifeforms.',
    unique:             false,
    luxury:             7,
    hp:                 30,
    isLandImprovement:  false,
    tobbles:            0,
    nup:                20,
    wiggsies:           60,
    getacles:           20,
    moaf:               1,
}, {
    displayName:        'scratching',
    craftName:          'scratching',
    shortDescription:   'a beautiful object for art lovers',
    description:        'A lot of effort is required to form a moaf into a scratching. Nearly lasts forever.',
    lore:               'A zot is often given a beautiful scratching at their Coming-of-Tax-Age day.',
    unique:             false,
    luxury:             10,
    hp:                 999,
    isLandImprovement:  false,
    tobbles:            20,
    nup:                20,
    wiggsies:           0,
    getacles:           0,
    moaf:               5,
}, 
{
    displayName:        'video game',
    craftName:          'videogame',
    shortDescription:   'undefineable',
    description:        'Undefineable',
    lore:               'A zot is often given a beautiful scratching at their Coming-of-Tax-Age day.',
    unique:             false,
    luxury:             5,
    hp:                 999,
    isLandImprovement:  false,
    tobbles:            1,
    nup:                1,
    wiggsies:           1,
    getacles:           1,
    moaf:               1,
}, 
{
    displayName:        'chapter',
    craftName:          'chapter',
    shortDescription:   'write a chapter for a book',
    description:        'Writing costs negligible resources.',
    lore:               'tbd.',
    unique:             false,
    luxury:             1,
    hp:                 999,
    isLandImprovement:  false,
    tobbles:            0,
    nup:                0,
    wiggsies:           0,
    getacles:           0,
    moaf:               0,
}, 
];

export function readTechList(inv, usingMobile=false) {
    const pd = 5;
    let summary = "".padEnd(18 + 29 + mobile_width, '_');
    if (inv) {

        if (usingMobile) {
            summary = "\nYou have:\n"
            summary += `${inv.tobbles}t`.padStart(pd) + `${inv.nup}n`.padStart(pd)
                        + `${inv.wiggsies}w`.padStart(pd) + `${inv.getacles}g`.padStart(pd) 
                        + `${inv.moaf}m`.padStart(pd);
        }

        else {

        // const res = `${inv.tobbles}t`.padStart(pd) + `${inv.nup}n`.padStart(pd)
        // + `${inv.wiggsies}w`.padStart(pd) + `${inv.getacles}g`.padStart(pd) 
        // + `${inv.moaf}m`.padStart(pd);
        // summary += `\nYou have:`.padEnd(20) + res.padEnd(40);
        // summary += "\n".padEnd(60, '_');


            const res = `|` +`${inv.tobbles}t`.padStart(pd) + `${inv.nup}n`.padStart(pd)
                        + `${inv.wiggsies}w`.padStart(pd) + `${inv.getacles}g`.padStart(pd) 
                        + `${inv.moaf}m`.padStart(pd) + `  |  `;
            summary = "You're holding:".padEnd(18) + res.padEnd(30);
            summary += "\n".padEnd(18 + 29 + mobile_width, '_');
        }
    }


    addToCurrentInbox(summary);
    addToCurrentInbox(getItemTechList());
    readCurrentInboxMail();
    addToCurrentInbox(getImprovementTechList());
    addToCurrentInbox("");
    addToCurrentInbox(getLuxuryList());

    addToCurrentInbox("".padEnd(18 + 29 + mobile_width, '_'));
    addToCurrentInbox("Type '? <craft>' for details.");
    readCurrentInboxMail();
}


export function getItemTechList(usingMobile=false) {
    const pd = 5;
    let list = "ITEMS:"
    tech.forEach(item => {
        if (!item.isLandImprovement && !item.luxury) {
            let str;
            if (usingMobile) { 
                const res = `${item.tobbles}t`.padStart(pd) + `${item.nup}n`.padStart(pd)
                        + `${item.wiggsies}w`.padStart(pd) + `${item.getacles}g`.padStart(pd) 
                        + `${item.moaf}m`.padStart(pd);
                str = `\n${item.craftName}`;
                str += `\n${res}`;
            }
            else {

                const res = `|` +`${item.tobbles}t`.padStart(pd) + `${item.nup}n`.padStart(pd)
                        + `${item.wiggsies}w`.padStart(pd) + `${item.getacles}g`.padStart(pd) 
                        + `${item.moaf}m`.padStart(pd) + `  |  `;
                str = "\n" + item.craftName.padEnd(18) + res.padEnd(30) + item.shortDescription;
            }
            list += str;
        }
    });
    //if (!usingMobile) list += "\n".padEnd(18 + 29 + mobile_width, '_')
    return list;
}

export function getImprovementTechList(usingMobile=false) {
    const pd = 5;
    let list = "LAND IMPROVEMENTS:"
    tech.forEach(item => {
        if (item.isLandImprovement && !item.luxury) {
            let str;
            if (usingMobile) { 
                const res = `${item.tobbles}t`.padStart(pd) + `${item.nup}n`.padStart(pd)
                        + `${item.wiggsies}w`.padStart(pd) + `${item.getacles}g`.padStart(pd) 
                        + `${item.moaf}m`.padStart(pd);
                str = `\n${item.craftName}`;
                str += `\n${res}`;
            }
            else {

                const res = `|` +`${item.tobbles}t`.padStart(pd) + `${item.nup}n`.padStart(pd)
                        + `${item.wiggsies}w`.padStart(pd) + `${item.getacles}g`.padStart(pd) 
                        + `${item.moaf}m`.padStart(pd) + `  |  `;
                str = "\n" + item.craftName.padEnd(18) + res.padEnd(30) + item.shortDescription;
            }
            list += str;
        }
    });
    //if (!usingMobile) list += "\n".padEnd(18 + 29 + mobile_width, '_')
    return list;
}

export function getLuxuryList(usingMobile=false) {
    const pd = 5;
    let list = "LUXURY (victory points):"
    tech.forEach(item => {
        if (item.luxury > 0) {
            logDEBUG("found lux");
            let str;
            if (usingMobile) { 
                const res = `${item.tobbles}t`.padStart(pd) + `${item.nup}n`.padStart(pd)
                        + `${item.wiggsies}w`.padStart(pd) + `${item.getacles}g`.padStart(pd) 
                        + `${item.moaf}m`.padStart(pd);
                str = `\n${item.craftName}(${item.luxury} vp)`;
                str += `\n${res}`;
            }
            else {

                const res = `|` +`${item.tobbles}t`.padStart(pd) + `${item.nup}n`.padStart(pd)
                        + `${item.wiggsies}w`.padStart(pd) + `${item.getacles}g`.padStart(pd) 
                        + `${item.moaf}m`.padStart(pd) + `  |  `;
                str = "\n" + `${item.craftName}(${item.luxury} vp)`.padEnd(18) + res.padEnd(30) + item.shortDescription;
            }
            list += str;
        }
    });
    //if (!usingMobile) list += "\n".padEnd(18 + 29 + mobile_width, '_')
    return list;
}


export function makeVillages(width, height) {
    let map = [];
    // Make land
    for (let i = 0; i < width; i++) {
        map.push([]);
        for (let j = 0; j < height; j++) {
            const randomTerrain = Math.random() > .9 ? getRandomElement(villageTerrain) : desertTerrain;
            const land =  {
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
            }

            map[i][j] = land;
        }
    }

    const villageCount = Math.max(Math.round(width * height / 25), 1);

    for (let i = 0; i < villageCount; i++) {
        const x = getRandomInt(0, width);
        const y = getRandomInt(0, height);
        const yUp = y + 1 == height ?  0 : y + 1;
        const yDown = y - 1 < 0 ? height - 1 : y - 1;
        const xRight = x + 1 == width ? 0 : x + 1;
        const xLeft = x - 1 < 0 ? width - 1: x - 1;
    
        let village = [
            grassTerrain, grassTerrain, 
            forestTerrain, forestTerrain, 
            oceanTerrain, 
            mountainTerrain, 
            getRandomElement(villageTerrain),
            getRandomElement(villageTerrain),
            getRandomElement(villageTerrain),
        ];
        village = shuffleArray(village);
        bloom(map[x][y], true, village[0]);
        bloom(map[x][yUp], true, village[1]);
        bloom(map[x][yDown], true, village[2]);
        bloom(map[xRight][y], true, village[3]);
        bloom(map[xRight][yUp], true, village[4]);
        bloom(map[xRight][yDown], true, village[5]);
        bloom(map[xLeft][y], true, village[6]);
        bloom(map[xLeft][yUp], true, village[7]);
        bloom(map[xLeft][yDown], true, village[8]);
    }

    return map;
}
