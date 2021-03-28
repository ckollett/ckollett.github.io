function toggleSelection(elt) {
    // Disallow selection of more than 5.
    let hashParts = splitHash(document.location.hash);
    if (hashParts.length >= 5 && !elt.classList.contains("selected")) {
        return;
    }
    
    let selected = elt.classList.toggle("selected");
    let tileId = elt.id;
    if (selected) {
        addToHash(tileId);
    } else {
        removeFromHash(tileId);
    }
    selectFromHash();
}

function countIfHandSelected(tiles) {
    if (tiles.length === 5) {
        let scoringGroups = scoreHand(tiles);
        let output = getScoreOutput(scoringGroups);
        document.getElementById("output").innerHTML = output;
    } else {
        document.getElementById("output").innerHTML = "";
    }    
}

function getTileForElt(elt) {
    return fromShortHand(elt.id);
}

function addTileForSelectedElement(elt) {
    let suit = elt.closest('.selectarea').getAttribute('data-suit');
    let value = elt.innerHTML;
    let tileId = suit + "_" + value;
    let newTile = document.createElement('div');
    newTile.id = tileId;
    newTile.classList.add(suit);
    newTile.classList.add('tile');
    let valueElt = document.createElement('div');
    valueElt.classList.add('value');
    valueElt.innerHTML = value;
    newTile.appendChild(valueElt);
    newTile.setAttribute("data-hash", elt.id)
    document.getElementById('tilerow').appendChild(newTile);
}

function selectFromHash() {
    clearSelections();
    let hash = document.location.hash;
    document.getElementById('tilerow').innerHTML = "";
    if (hash.length > 1 && hash.charAt(0) === '#') {
        hash = hash.substring(1);
    }
    if (hash.trim().length === 0) {
        return;
    }
    
    let tiles = [];
    let tileIds = splitHash(hash);
    for (let tileId of tileIds) {
        let selectedElt = document.getElementById(tileId);
        selectedElt.classList.add('selected');
        addTileForSelectedElement(selectedElt);
        tiles.push(fromShortHand(tileId));
    }
    countIfHandSelected(tiles);
}

function splitHash(hash) {
    let result = hash.match(/[cmst][^cmst]+/g);
    return result || [];
}

function removeFromHash(tileId) {
    let newHash = "";
    let hashParts = splitHash(document.location.hash);
    for (let hashPart of hashParts) {
        if (hashPart !== tileId) {
            newHash += hashPart;
        }
    }
    document.location.hash = newHash;
}

function addToHash(tileId) {
    document.location.hash += tileId;
}

function updateHash(hand) {
    document.location.hash = getHandShortHand(hand);
}

function scoreHand(hand) {
    let values = [];
    let suits = [];
    for (let tile of hand) {
        values.push(tile.value);
        suits.push(tile.suit);
    }
    
    let scoringGroups = findThings(values);
    let flush = findFlush(suits);
    if (flush) {
        scoringGroups.push(flush);
    }
    let nobs = findNobs(hand);
    if (nobs) {
        scoringGroups.push(nobs);
    }
    
    return scoringGroups;
}

function findNobs(hand) {
    let jackSuits = new Set();
    for (let i = 0; i < hand.length-1; i++) {
        let tile = hand[i];
        if (tile.value === 'J') {
            jackSuits.add(tile.suit);
        }
    }
    
    let turnSuit = hand[hand.length-1].suit;
    if (jackSuits.has(turnSuit)) {
        return new Nobs(turnSuit);
    } else {
        return null;
    }
}

function findFlush(suits) {
    let flushSuit = null;
    let max = 0;
    let counts = {};
    for (let suit of suits) {
        if (counts[suit]) {
            counts[suit]++;
        } else {
            counts[suit] = 1;
        }
        if (counts[suit] >= 4) {
            flushSuit = suit;
        }
    }
    
    return flushSuit ? new Flush(flushSuit, counts[flushSuit]) : null;
}

class Flush {
    constructor(suit, num) {
        this.suit = suit;
        this.num = num;
    }
    
    getScore() {
        return this.num;
    }
    
    getName() {
        let score = " for " + this.num;
        switch (this.suit) {
            case "campfire" : return "Bonfire" + score;
            case "tent" : return "Group site" + score;
            case "sleepingbag" : return "Slumber party" + score;
            case "mug" : return "Coffee shop" + score;
        }
    }
}

class Nobs {
    constructor(suit) {
        this.suit = suit;
    }
    
    getScore() {
        return 1;
    }
    
    getName() {
        let score = " for 1";
        switch (this.suit) {
            case "mug" : return "Joe" + score;
            case "campfire" : return "James" + score;
            default : return "Matching Jack (" + this.suit + ")" + score;
        }
    }
}

function findThings(values) {
    values = fixValues(values);
    values.sort((a,b) => a - b);
    let tuples = findTuples(values);
    let runsAndFifteens = findRunsAndFifteens(values);

    let things = [];
    
    // First look for a thing that contains two tuples.
    // e.g. 4 4 5 6 6 is a single thing containing both the
    // pair of fours and the pair of sixes.
    if (tuples.length === 2) {
        let components = findThingComponents(tuples, runsAndFifteens);
        if (components.included.length > 0) {
            things.push(new Thing(tuples, components.included));
            runsAndFifteens = components.excluded;
        }
    }
    
    
    // Now look at each tuple individually.
    for (let tuple of tuples) {
        let components = findThingComponents([tuple], runsAndFifteens);
        // Add it if it's a thing OR if the tuple isn't already part of
        // a thing. This is how we count pairs that aren't part of tuples.
        if (components.included.length > 0 || !tuple.thing) {
            things.push(new Thing([tuple], components.included));
        }
        runsAndFifteens = components.excluded;
    }

    // If there are any runs or fifteens left over, put each one in 
    // its own thing with no tuples.
    for (let runOrFifteen of runsAndFifteens) {
        things.push(new Thing([], [runOrFifteen]));
    }
    
    return things;
}
    
function getTotal(things) {
    let total = 0;
    for (let thing of things) {
        total += thing.getScore();
    }
    return total;
}    
    
function getScoreOutput(scoringGroups) {    
    let output = "Total: " + getTotal(scoringGroups);
    output += "<ul>";
    for (let group of scoringGroups) {
        output += "<li>" + group.getName() + "</lu>";
    }
    output += "</ul>";
    return output;
}

function fixValues(nums) {
  let fixed = [];
  for (let num of nums) {
    switch(num) {
        case "J" : fixed.push(11); break;
        case "Q" : fixed.push(12); break;
        case "K" : fixed.push(13); break;
        default : fixed.push(parseInt(num));
    }
  }
  return fixed;
}

function findTuples(values) {
    let tuples = [];
    let currentValue = -1;
    let count = 0;
    for (let value of values) {
        if (value === currentValue) {
            count++;
        } else {
            if (count > 1) {
                tuples.push(new Tuple(currentValue, count));
            }
            currentValue = value;
            count = 1;
        }
    }
    if (count > 1) {
        tuples.push(new Tuple(currentValue, count));
    }
    
    return tuples;
}

function findRunsAndFifteens(values) {
    let results = findFifteens(values);
    let run = findRun(values);
    if (run) {
        results.push(run);
    }    
    return results;
}

function findFifteens(values) {
    let fifteens = [];
    let combos = findCombinationsTotaling(values.slice(), 15);
    for (let combo of combos) {
        fifteens.push({"values" : combo, "type" : "fifteen-"});
    }
    return fifteens;
}

function findCombinationsTotaling(values, total) {
    let known = new Set();
    let combos = [];
    while (values.length > 0) {
        let tile = values.shift();
        value = Math.min(tile, 10);
        if (value === total) {
            combos.push([tile]);
        } else if (value < total) {
            subCombos = findCombinationsTotaling(values.slice(), total-value);
            for (let subCombo of subCombos) {
                const newValue = [tile].concat(subCombo);
                const newStr = JSON.stringify(newValue);
                if (!known.has(newStr)) {
                    combos.push(newValue);
                    known.add(newStr);
                }
            }
        }
    }
    return combos;
}

function findRun(values) {
    let run = [];
    for (let value of values) {
        if (run.length === 0 || value === run[run.length-1] + 1) {
            run.push(value);
        } else if (value === run[run.length-1]) {
            // continue on...
        } else if (run.length >= 3) {
            return {"values" : run, "type" : "run of "};
        } else {
            run = [value];
        }
    }
    return run.length >= 3 ? {"values" : run, "type" : "run of "} : null;
}

function choose(n, k) {
    if (k === 0 || n === 0) return 1;
    return (n * choose(n - 1, k - 1)) / k;
}

function findThingComponents(tuples, runsAndFifteens) {
    let components = {"included" : [], "excluded" : []};
    for (let runAndFifteen of runsAndFifteens) {
        if (isInThing(tuples, runAndFifteen.values)) {
            components.included.push(runAndFifteen);
        } else {
            components.excluded.push(runAndFifteen);
        }
    }
    return components;
}

function isInThing(tuples, values) {
    for (let tuple of tuples) {
        var fromTuple = values.filter(a => a === tuple.value);
        var tupleMultiplier = choose(tuple.count, fromTuple.length);
        if (tupleMultiplier <= 1) {
            return false;
        }
    }
    return true;
}

class Tuple {
    constructor(value, count) {
        this.value = value;
        this.count = count;
    }
}

class Thing {
    constructor(tuples, runsAndFifteens) {
        this.tuples = tuples;
        this.runsAndFifteens = runsAndFifteens;
        for (let tuple of tuples) {
            if (!tuple.thing) {
                tuple.thing = this;
            }
        }
    }
    
    getName() {
        this.tuples.sort((a,b) => b.count - a.count);
        this.runsAndFifteens.sort((a,b) => b.values.length - a.values.length);
        
        let name = "";
        let msAndNsName = this.getMsAndNsName();
        if (msAndNsName) {
            name = msAndNsName;
        } else if (this.runsAndFifteens.length === 0) {
            name = this.getPairName();
        } else if (this.runsAndFifteens.length === 1) {
            name = this.getTupleName();
        } else {
            name = this.getThingName();
        }

        if (this.tuples.length === 1 && this.tuples[0].thing != this) {
            name += " minus the pair";
        }
        
        name += " for " + this.getScore();
        return name;
    }
    
    getPairName() {
        let numTiles = this.tuples[0].count;
        switch (numTiles) {
            case 2 : return "pair";
            case 3 : return "pair royal";
            case 4 : return "double pair royal";
        }
    }
    
    getTupleName() {
        let name = "";
        for (let tuple of this.tuples) {
            let n = this.getTupleMultiplier(tuple);
            switch (n) {
                case 2 : name += "double "; break;
                case 3 : name += "triple "; break;
                case 4 : name += "quadruple "; break;
                case 6 : name += "sextuple "; break;
             }
        }
        
        let runOrFifteen = this.runsAndFifteens[0];
        name += runOrFifteen.type + runOrFifteen.values.length;
        return name;
    }
    
    getThingName() {
        let output = "(";
        for (let i = 0; i < this.runsAndFifteens.length; i++) {
            let runOrFifteen = this.runsAndFifteens[i];
            if (i > 0) output += ",";
            output += runOrFifteen.values.length;
        }
        output += ") ";
        if (this.tuples.length > 1) {
            output += "(";
        }
        for (let i = 0; i < this.tuples.length; i++) {
            let tuple = this.tuples[i];
            if (i > 0) output += ",";
            output += tuple.count;
        }
        if (this.tuples.length > 1) {
            output += ")";
        }
        output += "-thing";
        
        return output;       
    }
    
    getScore() {
        let score1 = 0;
        let score2 = 0;
        for (let runOrFifteen of this.runsAndFifteens) {
            score1 += runOrFifteen.values.length;
        }
        
        for (let tuple of this.tuples) {
            if (score1 > 0) {
                score1 *= this.getTupleMultiplier(tuple);
            }
            
            if (tuple.thing === this) {
                score2 += 2 * choose(tuple.count, 2);
            }
        }
        return score1 + score2;
    }
    
    getTupleMultiplier(tuple) {
        let tupled = this.runsAndFifteens[0].values.filter(value => value === tuple.value);
        return choose(tuple.count, tupled.length);
    }
    
    getMsAndNsName() {
        let numTiles = 0;
        if (this.runsAndFifteens.length > 1) {
            return false;
        }
        
        let allValues = new Set();
        for (let tuple of this.tuples) {
            allValues.add(tuple.value);
            numTiles += tuple.count;
        }
        if (this.runsAndFifteens.length === 1) {
            let runOrFifteen = this.runsAndFifteens[0];
            if (runOrFifteen.values.length > 2) {
                return false;
            }
            this.runsAndFifteens[0].values.forEach(item => allValues.add(item));
            numTiles += 2 - this.tuples.length;
        }
        if (allValues.size <= 2) {                        
            switch (allValues.values().next().value) {
                case 6 :
                case 9 : return "" + numTiles + " nines and sixes";
                case 7 :
                case 8 : return "" + numTiles + " eights and sevens";
            }
        }
        return null;
    }
}

function doClear() {
    document.location.hash = "";
    selectFromHash();
}

function clearSelections() {
    let selectedNums = document.querySelectorAll("div.num.selected");
    for (let selected of selectedNums) {
        selected.classList.remove("selected");
    }
    document.getElementById("tilerow").innerHTML = "";
    document.getElementById("output").innerHTML = "";   
}

function countRandomHand() {
    let hand = getRandomHand();
    let hash = getHandShortHand(hand);
    document.location.hash = hash;
    selectFromHash();
    let scoringGroups = scoreHand(hand);
    return getTotal(scoringGroups);
}

function selectHand(hand) {
    clearSelections();
    for (let tile of hand) {
        let id = getTileShortHand(tile);
        doToggle(document.getElementById(id));
    }
}

function getHandShortHand(hand) {
    let output = "";
    for (let tile of hand) {
        output += getTileShortHand(tile);
    }
    return output;
}

function getTileShortHand(tile) {
    return tile.suit.charAt(0) + tile.value;
}

function getHandFromShortHand(shortHand) {
    let tiles = [];
    let tileIds = splitHash(shortHand);
    for (let tileId of tileIds) {
        tiles.push(fromShortHand(tileId));
    }
    return tiles;
}

function fromShortHand(shortHand) {
    let suits = ["campfire","mug","sleepingbag","tent"];
    let suitStr = shortHand.charAt(0);
    for (let suit of suits) {
        if (suit.charAt(0) === suitStr) {
            suitStr = suit;
            break;
        }
    }
    let value = shortHand.substring(1);
    return {"suit" : suitStr, "value" : value};
}

function getRandomHand() {
    let suits = ["campfire","mug","sleepingbag","tent"];
    let hand = [];
    let handIndexes = getRandomIndexes();
    for (let idx of handIndexes) {
        let suitIdx = Math.floor(idx/13);
        let suit = suits[suitIdx];
        let value = getTileValue(idx);
        hand.push({"suit" : suit, "value" : value});
    }
    return hand;
}

function getTileValue(idx) {
    let value = idx % 13 + 1;
    switch (value) {
        case 11 : return "J";
        case 12 : return "Q";
        case 13 : return "K";
        default : return value.toString();
    }
}

function getRandomIndexes() {
    let selected = [];
    let swapped = {};
    
    for (let i = 52; i > 47; i--) {
        let r = Math.floor(i * Math.random());
        selected.push(swapped[r] ? swapped[r] : r);
        swapped[r] = swapped[i-1] ? swapped[i-1] : i-1;
    }
    return selected;
}

function findMonster() {
    let total = countRandomHand();
    if (total < 15) {
        setTimeout(findMonster, 180);
    }
}