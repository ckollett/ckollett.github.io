/* ********** URL Hash ********** */
function selectFromHash() {
    let tiles = getHandFromShortHand(document.location.hash);
    selectTiles(tiles);
    return displayAndScore(tiles);
}

function displayAndScore(tiles) {
    displayTiles(tiles);
    if (tiles.length === 5) {
        let scoreParts = scoreHand(tiles);
        scoreParts.sort((a,b) => b.priority - a.priority);
        let table = getOutputAsTable(scoreParts);
        document.getElementById('output').innerHTML = table;
        
        let total = new TotalScore(scoreParts);
        return total.getScore();
    } else {
        document.getElementById('output').innerHTML = '';
        return 0;
    }
}

function selectTiles(tiles) {
    clearSelections();
    tiles.forEach(tile => document.getElementById(tile.getId()).classList.add('selected'));
}

function clearSelections() {
    let selected = document.getElementsByClassName('selected');
    Array.from(selected).forEach(elt => elt.classList.remove('selected'));
}

function displayTiles(tiles) {
    document.getElementById('tilerow').innerHTML = '';
    tiles.forEach(tile => displayTile(tile));
}

function updateHash() {
    document.location.hash = hash;
}

function doClear() {
    document.location.hash = '';
    selectFromHash();
}

/* ********** CounterTile Display ********** */
function displayTile(tile) {
    let newTile = createTileElt(tile);
    document.getElementById('tilerow').appendChild(newTile);
}

function removeTile(tile) {
    if (typeof(tile) === 'CounterTile') {
        tile = tile.getId();
    }
    document.getElementById(tile).remove();
}

function createTileElt(tile) {
    if (typeof(tile) === 'string') {
        tile = CounterTile.fromId(tile);
    }
    
    let newTile = document.createElement('div');
    newTile.classList.add(tile.suit);
    newTile.classList.add('tile');
    let valueElt = document.createElement('div');
    valueElt.classList.add('value');
    valueElt.innerHTML = tile.getStringValue();
    newTile.appendChild(valueElt);
    return newTile;
}

/* ********** Handle Selection ********** */
function toggleSelection(elt) {
    let selection = splitShortHand(document.location.hash);
    if (selection.length >= 5 && !elt.classList.contains('selected')) {
        return;
    }
    
    let added = elt.classList.toggle("selected");
    if (added) {
        selection.push(elt.id);
    } else {
        let eltIdx = selection.indexOf(elt.id);
        selection.splice(eltIdx, 1);
    }
    let newHash = "";
    selection.forEach(id => newHash += id);
    document.location.hash = newHash;
    let hand = getHandFromShortHand(newHash);
    displayAndScore(hand);
}

function createHash() {
    let hash = "";
    let selected = document.getElementsByClassName('selected');
    Array.from(selected).forEach(elt => hash += elt.id);
}

/* ********** Output ********** */
function getOutputAsTable(scoreParts) {
    let table = '<table id="pasttable">';
    
    table += '<tr class="pastheader"><td class="pastname">Name</td><td class="pastscore">Score</td><td class="pastformula">Formula</td></tr>';
    for (let part of scoreParts) {
        table += createTableRow(part);
    }
    table += createTableRow(new TotalScore(scoreParts), "pasttotal");
    
    return table + "</table>";
}

function createTableRow(scorePart, rowClass) {
    let row = '<tr class="' + (rowClass || "part") + '">';
    row += '<td class="pastname">' + scorePart.getName() + '</td>';
    row += '<td class="pastscore">' + scorePart.getScore() + '</td>';
    row += '<td class="pastformula">' + scorePart.getFormula().replaceAll('*','&times') + '</td>';
    return row + '</tr>';
}


/* ********** CounterTile Functions and Class ********** */
function getHandFromShortHand(shortHand) {
    let tileIds = splitShortHand(shortHand);
    return tileIds.map(id => CounterTile.fromId(id));
}

function splitShortHand(shortHand) {
    let result = shortHand.match(/[cmst][^cmst]+/g);
    return result || [];
}

class CounterTile {
    constructor(value, suit) {
        this.value = CounterTile.toNumberValue(value);
        this.suit = CounterTile.resolveSuit(suit);
    }
    
    static suits = ["campfire","mug","sleepingbag","tent"];
    
    static fromId(id) {
        let suit = CounterTile.resolveSuit(id.charAt(0));
        return new CounterTile(id.substring(1), suit);
    }
    
    static resolveSuit(suit) {
        for (let s of CounterTile.suits) {
            if (s.startsWith(suit.toLowerCase())) return s;
        }
    }
    
    static toNumberValue(value) {
        switch (value.toString()) {
            case 'J' : return 11;
            case 'Q' : return 12;
            case 'K' : return 13;
            default : return parseInt(value);
        }
    }
    
    static toStringValue(value) {
        switch (value) {
            case 11 : return 'J';
            case 12 : return 'Q';
            case 13 : return 'K';
            default : return value.toString();
        }
    }
    
    getId() {
        return this.suit.charAt(0) + this.getStringValue();
    }
    
    getNumberValue() {
        return this.value;
    }
    
    getStringValue() {
        return CounterTile.toStringValue(this.value);
    }
}

/* ********** Scoring functions ********** */
function getTotal(scoreParts) {
    let total = 0;
    scoreParts.forEach(part => total += part.getScore());
    return total;
}

function scoreHand(tiles) {
    if (typeof(tiles) === 'string') tiles = getHandFromShortHand(tiles);
    
    let scores = scoreValues(tiles.map(tile => tile.value));
    let flush = findFlush(tiles.map(tile => tile.suit));
    if (flush) {
        scores.push(flush);
    }
    let nobs = findNobs(tiles);
    if (nobs) {
        scores.push(nobs);
    }
    return scores;
}

function scoreValues(values) {
    values.sort();
    
    let allComponents = [];
    let tuples = findTuples(values);
    allComponents = allComponents.concat(tuples);
    
    let scoringGroups = findRunsAndFifteens(values);
    allComponents = allComponents.concat(scoringGroups);
    
    // After creating the tupled groups we should be able to count the same score
    // after each step.
    let scores = {};
    scores.simpleCount = countTuplesAndGroups(tuples, scoringGroups);
    
    let tupledGroups = findTupledGroups(tuples, scoringGroups);
    allComponents = allComponents.concat(tupledGroups);
    
    let things = findThings(tuples, tupledGroups);
    allComponents = allComponents.concat(things);
    let merged = attemptMerge(things, tupledGroups.filter(tg => !tg.consumed));
    if (merged) {
        allComponents.push(merged);
    }
    
    // Once all components are merged we can use the count function,
    // since all of the minus-a-pair situations from things are resolved.
    scores.afterMerge = count(allComponents);
    scores.afterMergeFormula = countByFormula(allComponents);
    
    allComponents = allComponents.filter(item => !item.consumed);
    
    for (let s of allComponents) {
        console.log(s.getName());
        console.log("    " + s.getFormula());
    }
    
    console.log(scores);
    
    return allComponents;
}

function countTuplesAndGroups(tuples, groups) {
    let score = 0;
    for (let tuple of tuples) {
        score += tuple.getScore();
    }
    
    for (let group of groups) {
        score += group.getScore() * group.getTotalTupleCount(tuples);
    }
    return score;
}

function count(resolvedComponents) {
    let toScore = resolvedComponents.filter(comp => !comp.consumed);
    let score = 0;
    toScore.forEach(comp => score += comp.getScore());
    return score;
}

function countByFormula(allComponents) {
    let toScore = allComponents.filter(comp => !comp.consumed);
    let score = 0;
    toScore.forEach(comp => score += eval(comp.getFormula()));
    return score;
}

function attemptMerge(things, unusedTupleGroups) {
    // TODO: These should be validated. 
    // For compound thing, check that the scoring groups actually match.
    // For partial, check that the unused tuple is actually in the thing correctly.
    if (things.length > 1) {
        return new CompoundThing(things);
    } else if (things.length === 1 && unusedTupleGroups.length === 1) {
        return new PartialCompoundThing(things[0], unusedTupleGroups[0]);
    } else if (things.length === 0 && unusedTupleGroups.length > 1) {
        let unique = new Set();
        unusedTupleGroups.forEach(group => unique.add(group.scoringGroup));
        if (unique.size === 1) {
            return new CompoundTupledGroup(unusedTupleGroups);
        }
    } else {
        return null;
    }
}

function findTuples(values) {
    let unique = new Set();
    values.forEach(value => unique.add(value));
    
    let tuples = [];
    for (let u of unique) {
        let matches = values.filter(a => a === u);
        if (matches.length > 1) {
            tuples.push(new Tuple(u, matches.length));
        }
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
        fifteens.push(new ScoringGroup(combo, false));
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
            return new ScoringGroup(run, true);
        } else {
            run = [value];
        }
    }
    return run.length >= 3 ? new ScoringGroup(run, true) : null;
}

function findTupledGroups(tuples, groups) {
    let tupledGroups = [];
    for (let tuple of tuples) {
        for (let group of groups) {
            tupleCount = group.getTupleCount(tuple);
            if (tupleCount > 1) {
                tupledGroups.push(new TupledGroup(tuple, group));
            }
        }
    }
    return tupledGroups;
}

function findThings(tuples, tupledGroups) {
    let things = [];
    for (let tuple of tuples) {
        let groups = tupledGroups.filter(tg => tg.tuple.value === tuple.value);
        if (groups.length > 1) {
            things.push(new Thing(tuple, groups));
        }
    }
    return things;
}

function choose(n, k) {
    if (k === 0 || n === 0) return 1;
    return (n * choose(n - 1, k - 1)) / k;
}

function findFlush(suits) {
    for (let suit of suits) {
        let numInSuit = suits.filter(s => s === suit).length;
        if (numInSuit >= 4) {
            return new Flush(suit, numInSuit);
        }
    }
    
    return null;
}

function findNobs(hand) {
    let handCopy = hand.slice();
    let turnSuit = handCopy.pop().suit;
    let nobsTiles = handCopy.filter(tile => tile.suit === turnSuit && tile.value === 11);
    return nobsTiles.length === 1 ? new Nobs(turnSuit) : null;
}

/* ********** Scoring Objects ********** */

class Displayable {
    constructor() {
        this.priority = 0;
    }
    
    getName() {
        return "";
    }
    
    getFormula() {
        return "";
    }
    
    getScore() {
        return 0;
    }
}

class Scorable extends Displayable {
    constructor() {
        super();
        this.consumed = false;
    }
    
    getFormula() {
        let formula = "(";
        let inside = this.getInsideParens();
        for (let i = 0; i < inside.length; i++) {
            formula += inside[i];
            if (i < inside.length-1) formula += " + "
        }
        formula += ")";
        
        this.getOutsideParens().forEach(outside => formula += " * " + outside);
        return formula;
    }
    
    getInsideParens() {
        return [];
    }
    
    getOutsideParens() {
        return [];
    }
    
    getMultiplier() {
        let multiplier = 1;
        this.getOutsideParens().forEach(m => multiplier *= m);
        return multiplier;
    }
    
    getScore() {
        return 0;
    }
}

// A tuple is a repeated tile value within a hand
class Tuple extends Scorable {
    constructor(value, count) {
        super();
        this.value = value;
        this.count = count;
        this.priority = 1;
    }
    
    getName() {
        let name = "";
        switch (this.count) {
            case 2 : name = "Pair of "; break;
            case 3 : name = "Pair Royal of "; break;
            case 4 : name = "Double Pair Royal of "; break;
        }
        return name + this.value + "s";
    }
    
    getInsideParens() {
        return [this.count-1];
    }
    
    getOutsideParens() {
        return [this.count];
    }
    
    getScore() {
        // (count choose 2) * 2 = count * (count-1)
        return this.count * (this.count-1);
    }
}

// A scoring group is just a run or a fifteen
class ScoringGroup extends Scorable {
    constructor(values, isRun) {
        super();
        this.values = values;
        this.isRun = isRun;
        this.priority = 2;
    }
    
    getName() {
        let name = this.isRun ? "Run of " : "Fifteen-";
        name += this.values.length;
        return name;
    }

    getTotalTupleCount(tuples) {
        let total = 1;
        for (let tuple of tuples) {
            total *= this.getTupleCount(tuple);
        }
        return total;
    }

    getTupleCount(tuple) {
        let numUsed = this.values.filter(value => value === tuple.value).length
        return numUsed > 0 ? choose(tuple.count, numUsed) : 1;
    }
    
    getInsideParens() {
        return [this.values.length];
    }
    
    getOutsideParens() {
        return [];
    }
    
    getScore() {
        // Atomic!
        return this.values.length;
    }
}

// A tupled group is a scoring group that is counted
// multiple times because of a tuple.
class TupledGroup extends Scorable {
    constructor(tuple, scoringGroup) {
        super();
        this.tuple = tuple;
        this.scoringGroup = scoringGroup;
        tuple.consumed = true;
        scoringGroup.consumed = true;
        this.priority = 3;
    }
    
    getName() {
        return this.getTupleName() + this.scoringGroup.getName();
    }
    
    getTupleName() {
        return getTupleName(this.getTupleCount());
    }
    
    getInsideParens() {
        return [this.scoringGroup.values.length, this.tuple.count-1];
    }
    
    getOutsideParens() {
        return [this.tuple.count];
    }
    
    getTupleCount() {
        return this.scoringGroup.getTupleCount(this.tuple);
    }
    
    getScore() {
        // 1,2,2,3 should be 3*2 + 2
        // 1,2,2,2,3 should be 3*3 + 6
        // 4,4,4,4,7 should be 3*6 + 12
        return this.scoringGroup.getScore() * this.getTupleCount() + this.tuple.getScore();
    }
}

function getTupleName(count) {
    switch(count) {
        case 2 : return "Double ";
        case 3 : return "Triple ";
        case 4 : return "Quadruple ";
        case 6 : return "Sextuple ";
    }    
}

class CompoundTupledGroup extends Scorable {
    constructor(tupledGroups) {
        super();
        tupledGroups.forEach(group => group.consumed = true);
        this.scoringGroup = tupledGroups[0].scoringGroup;
        this.tuples = tupledGroups.map(group => group.tuple);
        this.priority = 4;
    }
    
    getName() {
        let name = "";
        for (let tuple of this.tuples) {
            name += getTupleName(tuple.count);
        }
        // Slight hack here but not too bad.
        name += this.scoringGroup.getName();
        return name;
    }
    
    getFormula() {
        let part1 = '';
        let part2 = ''
        for (let tuple of this.tuples) {
            part1 += tuple.count + ' * ';
            part2 += ' + ' + tuple.getScore();
        }
        return part1 + this.scoringGroup.getScore() + part2;
    }
    
    getScore() {
        let multiplier = 1;
        this.tuples.forEach(tuple => multiplier *= tuple.count);
        let score = multiplier * this.scoringGroup.getScore();
        for (let tuple of this.tuples) {
            score += tuple.getScore();
        }
        return score;
    }
    
}

// A thing happens when there are multiple tupled groups
// for the same tuple.
class Thing extends Scorable {
    constructor(tuple, tupledGroups) {
        super();
        this.tuple = tuple;
        this.tupledGroups = tupledGroups;
        this.groups = tupledGroups.map(tupledGroup => tupledGroup.scoringGroup);
        this.groups.sort((a,b) => b.values.length - a.values.length);
        tupledGroups.forEach(tg => tg.consumed = true);
        this.priority = 5;
    }
    
    getName() {
        let name = "(";
        for (let i = 0; i < this.groups.length; i++) {
            if (i > 0) name += ",";
            name += this.groups[i].values.length;
        }
        name += ") ";
        switch (this.tuple.count) {
            case 3 : name += "Royal "; break;
            case 4 : name += "Four-"; break;
        }
        name += "Thing";
        return name;
    }
    
    getInsideParens() {
        let inside = [];
        this.groups.forEach(group => inside = inside.concat(group.getInsideParens()));
        inside = inside.concat(this.tuple.getInsideParens());
        return inside;
    }
    
    getOutsideParens() {
        return this.tuple.getOutsideParens();
    }
    
    getScore() {
        let score = 0;
        // Need tupled groups for this!
        this.tupledGroups.forEach(tg => score += (tg.getTupleCount() * tg.scoringGroup.getScore()));
        score += this.tuple.getScore();
        return score;
    }
}

class CompoundThing extends Scorable {
    constructor(components) {
        super();
        this.components = components;
        this.components.sort((a,b) => a.tuple.count - b.tuple.count);
        components.forEach(c => c.consumed = true);
        this.priority = 6;
    }
    
    getName() {
        let name = "(";
        for (let i = 0; i < this.components[0].groups.length; i++) {
            if (i > 0) name += ",";
            name += this.components[0].groups[i].values.length;
        }
        name += ") Double Thing";
        return name;
    }
    
    getInsideParens() {
        // Ugly...
        return this.components[0].getInsideParens();
    }
    
    getOutsideParens() {
        let outside = [];
        this.components.forEach(comp => outside = outside.concat(comp.getOutsideParens()));
        return outside;
    }
    
    getScore() {
        let score = 0;
        this.components.forEach(comp => score += comp.getScore());
        return score;
    }
}

class PartialCompoundThing extends Scorable {
    constructor(thing, tupledGroup) {
        super();
        this.thing = thing;
        this.tupledGroup = tupledGroup;
        thing.consumed = true;
        tupledGroup.consumed = true;
        this.priority = 6;
    }
    
    getName() {
        // This needs a ton of work.
        let name = "(Double " + this.tupledGroup.scoringGroup.values.length + ",";
        name += this.thing.getName().substring(1);
        return name;
    }
    
    getInsideParens() {
        let inside = this.tupledGroup.getInsideParens().slice();
        inside = inside.concat(this.thing.getInsideParens());
        return inside;
    }
    
    getOutsideParens() {
        // The pair from the tupled group is accounted for inside
        // the parentheses. Need a better explanation for why this works!
        return this.thing.getOutsideParens();
    }
    
    getScore() {
        return this.thing.getScore() + this.tupledGroup.getScore();
    }
}

class Flush extends Scorable {
    constructor(suit, num) {
        super();
        this.suit = suit;
        this.num = num;
    }
    
    getScore() {
        return this.num;
    }
    
    getName() {
        switch (this.suit) {
            case "campfire" : return "Bonfire";
            case "tent" : return "Group site";
            case "sleepingbag" : return "Slumber party";
            case "mug" : return "Coffee shop";
        }
    }
    
    getInsideParens() {
        return [this.num];
    }
    
    getOutsideParens() {
        return [];
    }
}

class Nobs extends Scorable {
    constructor(suit) {
        super();
        this.suit = suit;
    }
    
    getScore() {
        return 1;
    }
    
    getName() {
        switch (this.suit) {
            case "mug" : return "Joe";
            case "campfire" : return "James";
            default : return "Matching Jack (" + this.suit + ")";
        }
    }
    
    getInsideParens() {
        return [1];
    }
    
    getOutsideParens() {
        return [];
    }    
}

class TotalScore extends Displayable {
    constructor(scoreParts) {
        super();
        this.scoreParts = scoreParts;
    }
    
    getName() {
        return "Total";
    }
    
    getScore() {
        let score = 0;
        this.scoreParts.forEach(part => score += part.getScore());
        return score;
    }
}

/* ********** Random ********** */
function showRandomHand() {
    document.location.hash = getRandomShortHand();
    return selectFromHash();
}

function getRandomShortHand() {
    let suits = ['c','m','s','t'];
    let shortHand = [];
    let handIndexes = getRandomIndexes();
    for (let idx of handIndexes) {
        let suitIdx = Math.floor(idx/13);
        let suit = suits[suitIdx];
        let value = CounterTile.toStringValue(idx % 13 + 1);
        shortHand += suit + value;
    }
    return shortHand;
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
    let total = showRandomHand();
    if (total < 15) {
        setTimeout(findMonster, 180);
    }
}