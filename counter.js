function toggleSelection(elt) {
    doToggle(elt);
    countIfHandSelected();
    updateHash();
}

function doToggle(elt) {
    let selectedElts = document.getElementsByClassName("selected");
    
    let added = false;
    if (selectedElts.length < 5) {
        added = elt.classList.toggle("selected");
    } else {
        // If there are already 5 selected allow deselection only.
        elt.classList.remove("selected");
    }
    
    if (added) {
        addTileForSelectedElement(elt);
    } else {
        let suit = elt.closest('.selectarea').getAttribute('data-suit');
        let value = elt.innerHTML;
        let tileId = suit + "_" + value;
        let toRemove = document.getElementById(tileId);
        if (toRemove) {
            toRemove.remove();
        }
    }
        
}

function countIfHandSelected() {
    let selectedElts = document.getElementsByClassName("selected");
    if (selectedElts.length === 5) {
        let cards = [];
        for (let selected of selectedElts) {
            cards.push(selected.innerHTML);
        }
        return score(cards);
    } else {
        document.getElementById("output").innerHTML = "";
        return 0;
    }    
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
    let hash = document.location.hash;
    if (hash.length > 1 && hash.charAt(0) === '#') {
        hash = hash.substring(1);
    }
    if (hash.trim().length === 0) {
        return;
    }
    
    let tiles = hash.matchAll(/[cmst][^cmst]+/g);
    for (let tile of tiles) {
        let selectedElt = document.getElementById(tile[0]);
        selectedElt.classList.add('selected');
        addTileForSelectedElement(selectedElt);
    }
    countIfHandSelected();
}

function updateHash() {
    let selectedElts = document.getElementsByClassName("tile");
    let hash = "";
    for (let elt of selectedElts) {
        hash += elt.getAttribute("data-hash");
    }
    document.location.hash = hash;
}

function score(values) {
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
    
    let total = 0;
    let output = "<ul>";
    for (let thing of things) {
        output += "<li>" + thing.toString() + "</lu>";
        total += thing.getScore();
    }
    output += "</ul>";
    output = "Total: " + total + output;
    document.getElementById("output").innerHTML = output;
    return total;
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

        if (this.tuples.length === 1 && this.tuples[0].thing != this) {
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
}

function clearSelections() {
    let selectedNums = document.querySelectorAll("div.num.selected");
    for (let selected of selectedNums) {
        selected.classList.remove("selected");
    }
    document.getElementById("tilerow").innerHTML = "";
    document.getElementById("output").innerHTML = "";   
    updateHash();
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
        doToggle(itemElt);
    }
    return countIfHandSelected();
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

function findMonster() {
    let score = countRandomHand();
    if (score >= 15) {
        done = true;
    } else {
        setTimeout(findMonster, 180);
    }
}