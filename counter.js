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
    let runsAndFifteens = findRunsAndFifteens(values);
    let groups = findGroups(values);
    
    findTuples(runsAndFifteens, groups);
    // Is there a more elegant way to do this?
    for (let combo of runsAndFifteens) {
        if (!combo.usesGroup) {
            let group = new Group(0);
            let tuple = new Tuple(combo, 1);
            group.addTuple(tuple);
            groups.push(group);
        }
    }
    let output = getOutput(groups, runsAndFifteens);
    document.getElementById("output").innerHTML = output;
}

function getOutput(groups, combos) {
    let output = '<table border="1">';
    output += '<tr><th>Score</th><th>Name</th><th>Repeated</th><th>Type</th><th>Values</th></tr>';
    
    let things = groups.slice();
    //let things = groups.filter(group => group.tuples.length > 0);
    for (let thing of things) {
        let numRows = thing.isThing() ? thing.tuples.length : 1;
        output += '\n<tr>';
        output += '\n  <td rowspan="' + numRows + '">' + thing.getScore() + '</td>';
        output += '\n  <td rowspan="' + numRows + '">' + thing.getName() + "</td>";
        if (thing.value > 0) {
            output += '\n  <td rowspan="' + numRows + '">' + thing.value + '</td>';
            if (thing.tuples.length > 0) {
                output += '\n  <td>' + thing.tuples[0].scoringCombo.type + '</td>';
                output += '\n  <td>' + thing.tuples[0].scoringCombo.values + '</td>';
                for (let i = 1; i < thing.tuples.length; i++) {
                    let tuple = thing.tuples[i];
                    output += '\n  <tr>';
                    output += '\n  <td>' + thing.tuples[i].scoringCombo.type + '</td>';
                    output += '\n  <td>' + thing.tuples[i].scoringCombo.values + '</td>';
                    output += '\n  </tr>';
                }
            }
        }
    }
    
    return output;
}

class Group {
    constructor(value) {
        this.value = value;
        this.size = 1;
        this.tuples = [];
    }
    
    increment() {
        this.size++;
    }
    
    addTuple(tuple) {
        this.tuples.push(tuple);
    }
    
    isThing() {
        return this.tuples.length > 1;
    }
    
    isTuple() {
        return this.tuples.length === 1;
    }
    
    getName() {
        switch (this.tuples.length) {
            case 0 : return this.getGroupName();
            case 1 : return this.tuples[0].toString();
            default : return this.getThingName();
        }
    }
    
    getThingParts() {
        let names = [];
        if (this.isThing()) {
            for (let tuple of this.tuples) {
                names.push(tuple.toString());
            }
        }
        return names;
    }
    
    getGroupName() {
        switch (this.size) {
            case 2 : return "Pair of " + this.value + "s";
            case 3 : return "Pair royal of " + this.value + "s";
            case 4 : return "Double pair royal of " + this.value + "s";
        }
    }
    
    getThingName() {
        let name = "(";
        for (let tuple of this.tuples) {
            if (name.length > 1) name += ",";
            name += tuple.scoringCombo.values.length;
        }
        name += ") ";
        name += this.size + "-thing";
        return name;
    }
    
    getScore() {
        let score = this.size - 1;
        for (let tuple of this.tuples) {
            score += tuple.scoringCombo.values.length;
        }
        score *= this.size;
        return score;
    }
    
    toString() {
        return this.getName();
    }
}

class ScoringCombo {
    constructor(values, type) {
        this.values = values;
        this.type = type;
        this.usesGroup = false;
    }
    
    toString() {
        let name = this.type === "fifteen" ? "fifteen-" : "run of ";
        name += this.values.length;
        return name;
    }
    
    getScore() {
        return this.values.length;
    }
}

class Tuple {
    constructor(combo, size) {
        this.scoringCombo = combo;
        this.size = size;
    }
    
    toString() {
        let name = "";
        switch (this.size) {
            case 2 : name = "Double "; break;
            case 3 : name = "Triple "; break;
            case 4 : name = "Quadruple "; break;
            case 6 : name = "Sextuple "; break;
        }
        name += this.scoringCombo.toString();
        return name;
    }
}

function getTileValues() {
    const inputStr = document.getElementById('array').value;
    let values = JSON.parse(inputStr);
    values = fixValues(values);
    values.sort((a, b) => a - b);
    return values;
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
        fifteens.push(new ScoringCombo(combo, "fifteen"));
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
            return new ScoringCombo(run, "run");
        } else {
            run = [value];
        }
    }
    return run.length >= 3 ? new ScoringCombo(run, "run") : null;
}

function findGroups(values) {
    let groups = [];
    let current = new Group(-1);
    for (let value of values) {
        if (value === current.value) {
            current.increment();
            if (current.size === 2) {
                groups.push(current);
            }
        } else {
            current = new Group(value);
        }
    }
    return groups;
}

function findTuples(runsAndFifteens, groups) {
    for (let group of groups) {
        for (let score of runsAndFifteens) {
            let found = score.values.filter(value => group.value === value);
            if (found.length > 0) {
                let tupleSize = choose(group.size, found.length);
                if (tupleSize > 1) {
                    group.addTuple(new Tuple(score, tupleSize));
                    score.usesGroup = true;
                }
            }
        }
    }
}

function choose(n, k) {
    if (k == 0) return 1;
    return (n * choose(n - 1, k - 1)) / k;
}