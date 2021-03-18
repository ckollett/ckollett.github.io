function toggleSelection(elt) {
    let selectedElts = document.getElementsByClassName("selected");
    
    let added = false;
    if (selectedElts.length < 5) {
        added = elt.classList.toggle("selected");
    } else {
        // If there are already 5 selected allow deselection only.
        elt.classList.remove("selected");
    }
    
    let suit = elt.closest('.selectarea').getAttribute('data-suit');
    let value = elt.innerHTML;
    let tileId = suit + "_" + value;
    if (added) {
        let newTile = document.createElement('div');
        newTile.id = tileId;
        newTile.classList.add(suit);
        newTile.classList.add('tile');
        let valueElt = document.createElement('div');
        valueElt.classList.add('value');
        valueElt.innerHTML = value;
        newTile.appendChild(valueElt);
        document.getElementById('tilerow').appendChild(newTile);
    } else {
        let toRemove = document.getElementById(tileId);
        if (toRemove) {
            toRemove.remove();
        }
    }
    
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
        things.push(new Thing([tuple], true));
    }
        
    let total = 0;
    let output = "<ul>";
    for (let thing of things) {
        output += "<li>" + thing.toString() + "</lu>";
        total += thing.getScore();
    }
    output += "</ul>";
    output = "Total: " + total + output;
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

function getThingForTuples(runsAndFifteens, tuples) {
    let minusThePair = tuples.length === 1 && tuples[0].isInThing;
    let thing = new Thing(tuples, minusThePair);
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

class Tuple {
    hasRunOrFifteen = false;
    isInThing = false;
    
    constructor(value, count) {
        this.value = value;
        this.count = count;
    }
}

class Thing {
    constructor (tuples, minusThePair) {
        this.tuples = tuples;
        for (let tuple of tuples) {
            tuple.isInThing = true;
        }
        this.runsAndFifteens = [];
        this.minusThePair = minusThePair;
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

        if (this.minusThePair) {
            name += " minus the pair";
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

function clearSelections() {
    let selectedNums = document.querySelectorAll("div.num.selected");
    for (let selected of selectedNums) {
        selected.classList.remove("selected");
    }
    document.getElementById("tilerow").innerHTML = "";
    document.getElementById("output").innerHTML = "";    
}

function countRandomHand() {
    clearSelections();
    let handIndexes = getRandomHand();
    for (let idx of handIndexes) {
        let suitIdx = Math.floor(idx/13);
        let value = idx % 13;
        
        let suitElts = document.querySelectorAll("div.selectrow div.selectarea");
        let suitElt = suitElts.item(suitIdx);
        let itemElts = suitElt.getElementsByClassName("num");
        let itemElt = itemElts.item(value);
        toggleSelection(itemElt);
    }
    
}

function getRandomHand() {
    let selected = [];
    let swapped = {};
    
    for (let i = 52; i > 47; i--) {
        let r = Math.floor(i * Math.random());
        selected.push(swapped[r] ? swapped[r] : r);
        swapped[r] = swapped[i-1] ? swapped[i-1] : i-1;
    }
    return selected;
}