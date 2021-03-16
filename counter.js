function toggleSelection(elt) {
    elt.classList.toggle("selected");
    
    let selectedElts = document.getElementsByClassName("selected");
    if (selectedElts.length === 5) {
        let cards = [];
        for (let selected of selectedElts) {
            cards.push(selected.innerHTML);
        }
        score(cards);
    } else {
        document.getElementById("output").innerHTML = "";
    }
}

function score(values) {
    values = fixValues(values);
    values.sort((a,b) => a - b);
    let tuples = findTuples(values);
    let runsAndFifteens = findRunsAndFifteens(values);
    
    let toCheck = [];
    if (tuples.length === 2) {
        toCheck.push(tuples);
    }
    for (let tuple of tuples) {
        toCheck.push([tuple]);
    }
    
    let things = [];
    let remaining = runsAndFifteens.slice();
    for (let tuplesToCheck of toCheck) {
        let thing = getThingForTuples(remaining, tuplesToCheck);
        remaining = thing.remaining;
        if (thing.runsAndFifteens.length > 0) {
            things.push(thing);
        }
    }
    
    for (let runOrFifteen of remaining) {
        let thing = new Thing([]);
        thing.runsAndFifteens.push(runOrFifteen);
        things.push(thing);
    }
    

    // TODO: Is there a better way to do this?
    let uncountedTuples = tuples.filter(tuple => !tuple.hasRunOrFifteen);
    for (let tuple of uncountedTuples) {
        things.push(new Thing([tuple]));
    }
        

    let output = "<ul>";
    for (let thing of things) {
        output += "<li>" + thing.toString() + "</lu>";
    }
    output += "</ul>";
    document.getElementById("output").innerHTML = output;
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
                tuples.push({"value" : currentValue, "count" : count, "hasRunOrFifteen" : false});
            }
            currentValue = value;
            count = 1;
        }
    }
    if (count > 1) {
        tuples.push({"value" : currentValue, "count" : count, "hasRunOrFifteen" : false});
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

function getThingForTuples(runsAndFifteens, tuples) {
    let thing = new Thing(tuples);
    for (let runOrFifteen of runsAndFifteens) {
        if (isInThing(runOrFifteen.values, tuples)) {
            thing.runsAndFifteens.push(runOrFifteen);
        } else {
            thing.remaining.push(runOrFifteen);
        }
    }
    return thing;
}

function isInThing(values, tuples) {
    var multipliers = [];
    for (let tuple of tuples) {
        var fromTuple = values.filter(a => a === tuple.value);
        var tupleMultiplier = choose(tuple.count, fromTuple.length);
        if (tupleMultiplier > 1) {
            tuple.hasRunOrFifteen = true;
        } else {
            return false;
        }
    }
    return true;
}

function choose(n, k) {
    if (k === 0 || n === 0) return 1;
    return (n * choose(n - 1, k - 1)) / k;
}

class Thing {
    constructor (tuples) {
        this.tuples = tuples;
        this.runsAndFifteens = [];
        this.minusThePair = false;
        this.remaining = [];
    }
    
    toString() {
        this.tuples.sort((a,b) => b.count - a.count);
        this.runsAndFifteens.sort((a,b) => b.values.length - a.values.length);
        
        let name = "";
        if (this.runsAndFifteens.length === 0) {
            name += this.getPairName();
        } else if (this.runsAndFifteens.length === 1) {
            name += this.getTupleName();
        } else {
            name += this.getThingName();
        }
        
        name += " for " + this.getScore();
        return name;
    }
    
    getPairName() {
        switch (this.tuples[0].count) {
            case 2 : return "pair";
            case 3 : return "pair royal";
            case 4 : return "double pair royal";
        }
    }
    
    getTupleName() {
        let name = "";
        for (let tuple of this.tuples) {
            let tupled = this.runsAndFifteens[0].values.filter(value => value === tuple.value);
            let n = choose(tuple.count, tupled.length);
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
            score1 *= tuple.count;
            if (!this.minusThePair) {
                score2 += 2 * choose(tuple.count, 2);
            }
        }
        return score1 + score2;
    }
}