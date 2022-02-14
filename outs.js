class Outs {
    constructor(tiles) {
        this.tiles = tiles;
        this.outs = new Map();
        this.values = [];
        this.populate();
    }
    
    populate() {
        let total = 0;
        const suits = ['c','m','s','t'];
        for (var i = 1; i <= 13; i++) {
            for (let suit of suits) {
                const tile = new CounterTile(i, suit);
                if (!this.hasTile(tile)) {
                    this.tiles.push(tile);
                    const scoreParts = scoreHand(this.tiles);
                    const score = new TotalScore(scoreParts).getScore();
                    
                    this.tiles.pop();
                    this.outs.set(tile.getId(), score);
                }
            }
        }   
        this.values = Array.from(this.outs.values()).sort((a,b) => a-b);
    }
    
    hasTile(tile) {
        for (let inHand of this.tiles) {
            if (inHand.getId() === tile.getId()) {
                return true;
            }
        }
        return false;
    }
    
    toTable() {
        var rows = ['<th></th>', '', '', '', ''];
        const suits = ['', 'campfire','mug','sleepingbag','tent'];
        for (let i = 1; i <= 13; i++) {
            rows[0] += '<th>' + CounterTile.toStringValue(i) + '</th>';
        }
        
        for (let j = 1; j <= 4; j++) { 
            const suit = suits[j];
            rows[j] += '<th class="' + suit + '">&nbsp;</th>';
            for (let i = 1; i <= 13; i++) {
                const id = suit[0] + CounterTile.toStringValue(i);
                if (this.outs.has(id)) {
                    rows[j] += '<td>' + this.outs.get(id) + '</td>';
                } else {
                    rows[j] += '<td>-</td>';
                }
            }
        }
        
        let table = '<table class="outs">';
        for (let row of rows) {
            table += '\n  <tr>' + row + '</tr>';
        }
        table += '\n</table>';
        return table;
    }
    
    getAverage() {
        const sum = this.values.reduce((total,value) => total + value);
        return sum/48;
    }
    
    getMedian() {
        return (this.values[23] + this.values[24])/2;
    }
    
    getMax() {
        return Math.max(...this.values);
    }
    
    getMin() {
        return Math.min(...this.values);
    }
    
    getBaseScore() {
        const scoreParts = scoreHand(this.tiles);
        return new TotalScore(scoreParts).getScore();
    }
}

function getOutsHtml(tiles) {
    const outs = new Outs(tiles);
    let html = '<div class="outscontainer">' + outs.toTable();
    html += '<div class="outs_summary">';
    html += '<div>Min: ' + outs.getMin() + '</div>';
    html += '<div>Max: ' + outs.getMax() + '</div>';
    html += '<div>Median: ' + outs.getMedian() + '</div>';
    html += '<div>Average: ' + outs.getAverage().toFixed(2) + '</div>';
    html += '</div></div>';
    return html;
    
    
}