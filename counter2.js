function scoreHand(tiles) {
    let values = [];
    tiles.forEach(tile => values.push(tile.value));
}

function scoreValues(values) {
    values.sort();
    
    let toScore = [];
    let tuples = findTuples(values);
    toScore = toScore.concat(tuples);
    
    let scoringGroups = findRunsAndFifteens(values);
    toScore = toScore.concat(tuples);
    
    let tupledGroups = findTupledGroups(tuples, scoringGroups);
    toScore = toScore.concat(tupledGroups);
    
    let things = findThings(tuples, tupledGroups);
    toScore = toScore.concat(things);
    if (things.length > 1) {
        toScore.push(new CompoundThing(things));
    } else if (things.length === 1) {
        let utg = tupledGroups.filter(tg => !tg.consumed);
        if (utg.length === 1) {
            toScore.push(new PartialCompoundThing(things[0], utg[0]));
        }
    }

    
    toScore = toScore.filter(item => !item.consumed);
    
    for (let s of toScore) {
        console.log(s.getName());
        console.log("    " + s.getFormula());
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
}

class CompoundScorable extends Scorable {
    getInsideParens() {
        let inside = [];
        let comp = this.getComponents();
        comp.forEach(c => inside = inside.concat(c.getInsideParens()));
        return inside;
    }
    
    getOutsideParens() {
        let outside = [];
        this.getComponents().forEach(c => outside = outside.concat(c.getOutsideParens()));
        return outside;
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

    getTupleCount(tuple) {
        let numUsed = this.values.filter(value => value === tuple.value).length
        return numUsed > 0 ? choose(tuple.count, numUsed) : 0;
    }
    
    getInsideParens() {
        return [this.values.length];
    }
    
    getOutsideParens() {
        return [];
    }
}

// A tupled group is a scoring group that is counted
// multiple times because of a tuple.
class TupledGroup extends CompoundScorable {
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
    
    getComponents() {
        return [this.scoringGroup, this.tuple];
    }
    
    getTupleCount() {
        return this.scoringGroup.getTupleCount(this.tuple);
    }
}

// A thing happens when there are multiple tupled groups
// for the same tuple.
class Thing extends CompoundScorable {
    constructor(tuple, tupledGroups) {
        super();
        this.tuple = tuple;
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
    
    getComponents() {
        let components = this.groups.slice();
        components.push(this.tuple);
        return components;
    }
            
}

class CompoundThing extends CompoundScorable {
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
    
    getComponents() {
        return this.components;
    }
    
    getInsideParens() {
        return this.components[0].getInsideParens();
    }
}

class PartialCompoundThing extends CompoundScorable {
    constructor(thing, tupledGroup) {
        super();
        this.thing = thing;
        this.tupledGroup = tupledGroup;
        thing.consumed = true;
        tupledGroup.consumed = true;
    }
    
    getName() {
        // This needs a ton of work.
        return "(Double " + this.tupledGroup.scoringGroup.values.length + ",2) Thing";
    }
    
    getComponents() {
        return [this.tupledGroup, this.thing];
    }
    
    getOutsideParens() {
        // The pair from the tupled group is accounted for inside
        // the parentheses. Need a better explanation for why this works!
        return this.thing.getOutsideParens();
    }
}