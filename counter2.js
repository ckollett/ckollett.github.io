function scoreHand(tiles) {
    let values = [];
    tiles.forEach(tile => values.push(tile.value));
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

/* ********** Scoring Objects ********** */

class Scorable {
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
        this.consumed = false;
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
        this.consumed = false;
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
        this.consumed = false;
    }
    
    getName() {
        let name = "";
        switch(this.getTupleCount()) {
            case 2 : name = "Double "; break;
            case 3 : name = "Triple "; break;
            case 4 : name = "Quadruple "; break;
            case 6 : name = "Sextuple "; break;
        }
        return name + this.scoringGroup.getName();
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
        this.consumed = false;
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
    }
}

class PartialCompoundThing extends Scorable {
    constructor(thing, tupledGroup) {
        super();
        this.thing = thing;
        this.tupledGroup = tupledGroup;
        thing.consumed = true;
        tupledGroup.consumed = true;
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