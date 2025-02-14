import readline from 'node:readline'; // Required to read input from the console in Node.js
import { handleGameInput, setGeorgeBotsRunning, setGeorgePlayer } from './operationHandler.js';
import { startHandleConsoleInput, getConsolePlayerName, logWarning, logDEBUG } from './output.js';
import { setLizzieUnavailable } from './lizzie.js';
import { getRandomElement, getRandomInt, vecToLoc } from './helpers.js';
import { resCodes, tech } from './henry.js';
import { isNumberObject } from 'node:util/types';


// Create an interface for reading input from stdin and writing to stdout
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> ' // This is the prompt that will be displayed to the user
});


// Display the initial prompt
rl.prompt();

function handleConsoleInput(input) {
  if (input == 'go') {
    runBotsToday();
    return false;
  }

  startHandleConsoleInput();
  setGeorgePlayer(getConsolePlayerName());
  let quitApp = false;
  try {
    quitApp = handleGameInput(input);
  }
  catch (err) {
    console.log(`\n\nERROR IN handleGameInput FROM MESSAGE: ${input}\n\nError: ${err.message}\nStack trace:\n${err.stack}\n\n`);
    console.log("but you can proceed...");
  }  

  return quitApp;
}

// Event listener for handling input
rl.on('line', (input) => {
  if (handleConsoleInput(input)) rl.close();  // Handle each line of input
  else rl.prompt();
});

// Event listener for handling when the input stream is closed
rl.on('close', () => {
  setLizzieUnavailable();
  console.log('Goodbye!');
  process.exit(0); // Exit the program
});

// We also could test all ops
// We also could test '?' on all ops
// We also could test 'lore' on all ops
// We also could test 'settings'


function makeViewings() {
  return [
    `i`,
    `i ${getRandomInt(1,10)} ${getRandomInt(1,10)}`,
    `look`,
    `look ${getRandomPlot()}`,
    `players`,
    `bid`,
    `offer`,
    `accept`,
    `cancel`,
    `cancel all`,
    `taxes`,
    `taxes ${getRandomInt(1,10)}${getRandomElement(resCodes)}`,
    `taxes ${getRandomPlot()} ${getRandomInt(1,10)}`,
    `${getRandomElement(tech).craftName}`,
    `improvements`,
    //`ready`,
  ];
}

function getRandomPlot() {
  return vecToLoc([getRandomInt(0,5), getRandomInt(0,5)]);
}



function makeComms() {
  return [
    `inject use`,
    `droplet use`,
    `bid ${getRandomPlot()} ${getRandomInt(1,10)}`,
    `bid ${getRandomPlot()} ${getRandomInt(1,10)}`,
    `bid ${getRandomPlot()} ${getRandomInt(1,10)}`,
    `bid ${getRandomPlot()} ${getRandomInt(1,10)}`,
    `offer ${getRandomInt(1,3)}${getRandomElement(resCodes)} for ${getRandomInt(1,3)}${getRandomElement(resCodes)}`,
    `offer rent ${getRandomPlot()} 10 for ${getRandomInt(1,3)}${getRandomElement(resCodes)}`,
    `offer rent ${getRandomPlot()} 10 for ${getRandomInt(1,3)}${getRandomElement(resCodes)}`,
    `offer rent ${getRandomPlot()} 10 for ${getRandomInt(1,3)}${getRandomElement(resCodes)}`,
    `offer rent ${getRandomPlot()} 10 for ${getRandomInt(1,3)}${getRandomElement(resCodes)}`,
    `offer rent ${getRandomPlot()} 10 for ${getRandomInt(1,3)}${getRandomElement(resCodes)}`,
    `offer ${getRandomInt(1,3)}${getRandomElement(resCodes)} for rent ${getRandomPlot()} 10`,
    `offer ${getRandomInt(1,3)}${getRandomElement(resCodes)} for rent ${getRandomPlot()} 10`,
    `offer ${getRandomInt(1,3)}${getRandomElement(resCodes)} for rent ${getRandomPlot()} 10`,
    `offer ${getRandomInt(1,3)}${getRandomElement(resCodes)} for rent ${getRandomPlot()} 10`,
    `offer ${getRandomInt(1,3)}${getRandomElement(resCodes)} for rent ${getRandomPlot()} 10`,
    `offer cancel ${getRandomInt(1, 31)}`,
    `accept ${getRandomInt(1,10)}`,
    `accept ${getRandomInt(1,10)}`,
    `accept ${getRandomInt(1,10)}`,
    `accept ${getRandomInt(1,10)}`,
    `accept ${getRandomInt(1,10)}`,
    `accept ${getRandomInt(1,10)}`,
    `abandon ${getRandomPlot()}`,
    `stash ${getRandomInt(-2,20)}${getRandomElement(resCodes)}`,
    `take ${getRandomInt(-2,20)}${getRandomElement(resCodes)}`,
    `drop ${getRandomInt(-2,20)}${getRandomElement(resCodes)}`,
    `speak i'm a bot`,
    `speak i'm a bot`,
    `speak i'm a bot`,
    `speak i'm a bot`,
    `speak i'm a bot`,
    `shout i'm a bot`,
    `shout i'm a bot`,
    `shout i'm a bot`,
  ];
}

function makeGatherDay() {
  return [
    `seize all`,
    `gather ${getRandomElement(resCodes)}`,
    `gather ${getRandomElement(resCodes)}`,
    `gather ${getRandomElement(resCodes)}`,
    `gather ${getRandomElement(resCodes)}`,
    `gather ${getRandomElement(resCodes)}`,
    `gather ${getRandomElement(resCodes)}`,
    `gather ${getRandomElement(resCodes)}`,
  ];
}

function makeCraftDay() { 
  return [
    `seize all`,
    `craft ${getRandomElement(tech).craftName}`,
    `craft ${getRandomElement(tech).craftName}`,
    `craft ${getRandomElement(tech).craftName}`,
    `craft ${getRandomElement(tech).craftName}`,
    `craft ${getRandomElement(tech).craftName}`,
    `craft ${getRandomElement(tech).craftName}`,
    `craft ${getRandomElement(tech).craftName}`,
  ];
}

const moveDirs = ['ul','u','ur','r','sw','s','se','e'];

function makeMoveDay() {
  return [
    `seize all`,
    `move ${getRandomElement(moveDirs)}`,
    `move ${getRandomElement(moveDirs)}`,
    `move ${getRandomElement(moveDirs)}`,
    `move ${getRandomElement(moveDirs)}`,
    `move ${getRandomElement(moveDirs)}`,
    `move ${getRandomElement(moveDirs)}`,
    `move ${getRandomElement(moveDirs)}`,
  ];
}


const bots = ['peter','paul','mary','mama','papa','baby',]
let botLife = 100;

function testGameInput(input) {
  logWarning("TESTINPUT CONSOLE:" + input);
  logDEBUG("TESTINPUT:" + input);
  startHandleConsoleInput();
  setGeorgePlayer(getConsolePlayerName());
  handleGameInput(input);
}

function runBots(args) {

  const num = parseInt(args[1]);
  if (isNumberObject(num)) {
    logWarning("set botlife to " + num);
    botLife = num;
  }

  logWarning("runBots");
  setGeorgeBotsRunning(true);
  for (let i = 0; i < bots.length; i++) {
    testGameInput('switch');
    testGameInput(`join ${bots[i]}`);
  }

  testGameInput(`start`);

  for (let i = 0; i < bots.length; i++) {
    testGameInput(`switch ${bots[i]}`);
    testGameInput('poweroverwhelming');
    testGameInput('poweroverwhelming');
    testGameInput('showmethemoney');
    testGameInput('showmethemoney');
  }

  for (let dayCount = 0; dayCount < botLife; dayCount++) {
    runBotsToday();
  }

  testGameInput(`scoreboard`);

  setGeorgeBotsRunning(false);
  logWarning("done running bots");
}

function startBots() {
  logWarning("runBots");

  setGeorgeBotsRunning(true);
  for (let i = 0; i < bots.length; i++) {
    testGameInput('switch');
    testGameInput(`join ${bots[i]}`);
  }
  testGameInput(`start`);
  for (let i = 0; i < bots.length; i++) {
    testGameInput(`switch ${bots[i]}`);
    testGameInput(`showmethemoney`);
    testGameInput(`showmethemoney`);
    testGameInput(`poweroverwhelming`);
    testGameInput(`poweroverwhelming`);
  }
  setGeorgeBotsRunning(false);
  logWarning("done running bots");
}

let dayCount = 0;

function runBotsToday() {
  logWarning("day: " + dayCount);
  setGeorgeBotsRunning(true);
  
  for (let botIndex = 0; botIndex < bots.length; botIndex++) {
    testGameInput(`switch ${bots[botIndex]}`);

    const viewings = makeViewings();
    for (let i = 0; i < 5; i++) {
      testGameInput(getRandomElement(viewings));
    }
    const comms = makeComms();
    for (let i = 0; i < 15; i++) {
      testGameInput(getRandomElement(comms));
    }

    let dayType = getRandomInt(0, 4);
    let randomDay;
    if (dayType == 0) randomDay = makeGatherDay();
    else if (dayType == 1) randomDay = makeMoveDay();
    else if (dayType == 2) randomDay = makeCraftDay();
    else randomDay = getRandomElement([makeGatherDay(), makeMoveDay(), makeCraftDay()]);
    for (let i = 0; i < randomDay.length; i++) {
      testGameInput(randomDay[i]);
    }

    testGameInput('look');
    testGameInput('i');
    testGameInput(`ready`);
    console.log("RAN DAY.....................................")
  }

  setGeorgeBotsRunning(false);
  dayCount++;
}




if (false) {
  testGameInput('join max');
  testGameInput('start');
  testGameInput('showmethemoney');
  testGameInput('bid a1 10');
  testGameInput('bid a2 6');
  testGameInput('bid a3 8');
  testGameInput('bid a4 9');

  testGameInput('switch');
  testGameInput('join paul');
  testGameInput('bid a1 11');
  testGameInput('bid a2 5');
  testGameInput('bid a3 8');
  testGameInput('bid a4 9');
  testGameInput('showmethemoney');


  testGameInput('switch');
  testGameInput('join mary');
  testGameInput('bid a1 11');
  testGameInput('bid a2 5');
  testGameInput('bid a3 8');
  testGameInput('bid a4 9');

  testGameInput('showmethemoney');

  
  testGameInput('forceready');
  testGameInput('forceready');
  testGameInput('forceready');
  testGameInput('forceready');
  testGameInput('forceready');

  testGameInput('land 2m');
  testGameInput('land 1w');
  testGameInput('switch max');
  testGameInput('land 999w');
  testGameInput('switch paul');
  testGameInput('land 30g');

  testGameInput('forceready');
  testGameInput('forceready');
  testGameInput('forceready');
  testGameInput('forceready');
  testGameInput('forceready');


  testGameInput('scoreboard');
}


if (false) {
  testGameInput('join max');
  testGameInput('start');
  testGameInput('move r');
  testGameInput('move r');
  testGameInput('move u');
  testGameInput('move u');
  testGameInput('offer 10n for 10m');
  testGameInput('forceready');
  testGameInput('showmethemoney');

  testGameInput('switch');
  testGameInput('join paul');
  testGameInput('move l');
  testGameInput('move l');
  testGameInput('move d');
  testGameInput('move d');
  testGameInput('offer 10t for 10w');
  testGameInput('forceready');
  testGameInput('showmethemoney');

}

export function testSuite(args) {
  runBots(args);
  //startBots();

}