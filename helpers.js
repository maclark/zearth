import { logDEBUG, logWarning } from "./output.js";

export function parseResBit(arg) {
    if (!arg) return null;

    const firstChars = arg.substring(0, arg.length - 1);
    const lastChar = arg.charAt(arg.length - 1);
    const num = parseInt(firstChars);

    if (Number.isNaN(num) || num < 0) return null;
    if (!['t', 'n', 'w', 'g', 'm'].includes(lastChar)) return null;

    return { resCode: lastChar, quantity: num };
}

export function numToLetter(number) {
    // Ensure the input is within the valid range
    if (number < 0 || number > 25) {
        return "Invalid input. Please enter a number between 1 and 26.";
    }
    
    // Convert the number to a corresponding letter
    // We want 0 to be a, since 
    return String.fromCharCode(65 + number).toLowerCase(); // 65 is 'A', 66 is 'B', and so on...
}

export function letterToChessFile(letter) {
    letter = letter.toUpperCase();

    if (letter.length !== 1 || letter < 'A' || letter > 'Z') {
        return "Invalid input. Please enter a single letter between A and Z.";
    }

    // Convert the letter to its corresponding number
    const num = letter.charCodeAt(0) - 65;
    return num; // 'A' is 65 in Unicode, so 'A' - 65 = 0
}

export function vecToLoc(v2) {
    return `${numToLetter(v2[0])}${v2[1] + 1}`;
}

export function removeFromArr(array, element) {
    const index = array.indexOf(element); // Find the index of the element
    if (index !== -1) { // Check if the element exists in the array
        array.splice(index, 1); // Remove the element at the found index
    }
    return array; // Return the modified array
}

export function equalArray(arr1, arr2) {
    // Check if both are arrays
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;

    // Check if arrays have the same length
    if (arr1.length !== arr2.length) return false;

    // Check if all elements in the arrays are equal
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }

    return true; // Arrays are equal
}

export function locToVec(input) {
    const letter = input.charAt(0).toLowerCase();
    const y = parseInt(input.substring(1));
    return [letterToChessFile(letter), y - 1];
}

export function parseChessNotation(input, mapSize) {

    let coord = {x: -1, y: -1, valid: false, warning: ''};

    if (!input) {
        coord.warning = "No input, e.g. 'a1' or 'c12'.";
        return coord;
    }

    if (input.length < 2) {
        coord.warning = "Must enter a column and row together, e.g. 'a1' or 'c12'.";
        return coord;
    }

    if (!mapSize) {
        logDEBUG("need mapsize to parsechessnotation");
        coord.warning = "Must enter a column and row together, e.g. 'a1' or 'c12'.";
        return coord;
    }
    
    const letter = input.charAt(0).toLowerCase();
    if (letter < 'a' || letter > numToLetter(mapSize[0] - 1)) {
        coord.warning = `Column '${letter}' out-of-bounds. Use 'a' to '${numToLetter(mapSize[0] - 1)}'.`;
        return coord;
    }
    else coord.x = letterToChessFile(letter);

    const y = parseInt(input.substring(1));
    // We add 1 to the rows duh
    if (Number.isNaN(y) || y < 1 || y >= mapSize[1] + 1) {
        coord.warning = `Row '${input.substring(1)}' is out-of-bounds. Use 1 to ${mapSize[1]}.`;
        return coord;
    }
    else 
    {
        coord.y = y - 1; // becase rows start at 1 not 0
        coord.valid = true;
        return coord;
    }
}

export function getRandomElement(arr) {
    if (!Array.isArray(arr) || arr.length === 0) {
        throw new Error("Input must be a non-empty array of single characters.");
    }

    // Generate a random index
    const randomIndex = Math.floor(Math.random() * arr.length);

    // Return the element at the random index
    return arr[randomIndex];
}

export function getRandomInt(x, y) {
    // Ensure x is the minimum and y is the maximum
    const min = Math.ceil(x);
    const max = Math.floor(y);
    // Generate a random integer between min (inclusive) and max (exclusive)
    return Math.floor(Math.random() * (max - min)) + min;
}

export function vAdd(v1, v2) {
    return [v1[0] + v2[0], v1[1] + v2[1]];
}

export function within1Move(v1, v2) {
    if (isMyV2(v1) && isMyV2(v2)) {
        return ((Math.abs(v1[0] - v2[0]) <= 1) && (Math.abs(v1[1] - v2[1])) <= 1);
    }
    else logWarning("not vectors");
    return false;
}

function isMyV2(arg) {
    return arg != null && typeof arg === 'object' && 
        typeof arg[0] === 'number' && typeof arg[1] === 'number';
}

export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
        [array[i], array[j]] = [array[j], array[i]];   // swap elements
    }
    return array;
}