window.onload = init;

function init() {
  showClock();
  var currentGame = localStorage.getItem("currentCribbageGame");
  if (currentGame) {
    document.getElementById("restore").style.display = "block";
  }
  showLastGame();
}

function showLastGame() {
  var lastGame = localStorage.getItem("lastCribbageGame");
  if (lastGame) {
    lastGame = JSON.parse(lastGame);
    document.getElementById("lastRed").innerHTML = lastGame.red;
    document.getElementById("lastBlue").innerHTML = lastGame.blue;
    document.getElementById("lastGame").style.display = "block";
  }  
}

function startGame(firstDealer) {
  window.game = new Game([], new BeforePeggingState(firstDealer));
  window.game.state.updateUI();
  addDealerDisplay();
}

function addDealerDisplay(dealer) {
    if (!dealer) {
        dealer = window.game.state.dealer;
    }
    document.getElementById("currentscore").classList.add(dealer + "dealer");
}

function undo() {
  if (game.history.length > 0) {
    if (game.state.undo) {
      game.state.undo();
    }

    var lastItem = game.history.pop();
    game.state = resolveState(lastItem.state);
    
    var lastPlay = getMostRecentHistoryItem();
    lastPlay.parentElement.removeChild(lastPlay);
    
    historyChanged();
    removeOverlay();
  }
}

function getMostRecentHistoryItem() {
  var historyElt = document.getElementById("history");
  return historyElt.getElementsByClassName("historyitem")[1];
}

function restore() {
  var savedGame = JSON.parse(localStorage.currentCribbageGame);
  window.game = new Game(savedGame.history, savedGame.state);
  historyChanged();
  savedGame.history.forEach(function(item) {
    addDealerDisplay(item.state.dealer);
    addToHistory(item.play);
  });
  addDealerDisplay();
}

/* ********* Basic constants ********* */

window.historyListeners = [updateScoreboard, movePeg, addDealerDisplay];
window.playListeners = [addToHistory, addMessage];

/* ********* Gameplay objects ********* */

function historyChanged() {
  historyListeners.forEach(function(listener) {
    listener();
  });
  game.state.updateUI();
  // Yuck.
  if (game.state.name !== "go") {
    localStorage.setItem("currentCribbageGame", JSON.stringify(game));
  }
}

function Game(history, state) {
  this.history = history;
  this.state = resolveState(state);
  showBoard();
}

function getScores() {
  var scores = {
    red: new ColorScores(),
    blue: new ColorScores()
  };

  game.history.forEach(function(item) {
    scores[item.play.color].addPlay(item.play);
  });

  return scores;
}

function ColorScores() {
  this.Peg = 0;
  this.Hand = 0;
  this.Crib = 0;
}
ColorScores.prototype.getTotal = function() {
  return this.Peg + this.Hand + this.Crib;
};
ColorScores.prototype.addPlay = function(scoringPlay) {
  var type = scoringPlay.type;
  if (type === "Nobs") {
    type="Peg";
  }
  this[type] += scoringPlay.score;
};

/* ********* Gameplay functions ********* */

function handlePegButton(color) {
  handleScoreButton(color, "Peg");
}

function handleCountButton() {
  var type = document.getElementById("handCribButton").innerHTML;
  var color = game.state.getCountingColor();
  handleScoreButton(color, type);
}

function handleScoreButton(color, type) {
  if (type === "Nobs") {
    var score = 2;
    var bigSlider = document.getElementById("currentscore");
    bigSlider.querySelector(".currentvalue").innerHTML = "2";
  } else {
    var score = parseInt(document.getElementById("slider").value);
  }
  pointsScored(color, score, type);
  document.getElementById("slider").value = 1;
  sliderMoved();
}

function pointsScored(color, score, type) {
  var total = getScores()[color].getTotal();
  var counted = Math.min(121 - total, score);

  var scoringPlay = {
    color: color,
    value: score,
    score: counted,
    type: type,
  };
  addIcon(scoringPlay);

  playListeners.forEach(function(listener) {
    listener(scoringPlay);
  });

  var historyItem = {
    state: game.state,
    play: scoringPlay
  };
  game.history.push(historyItem);
  game.state = nextState(scoringPlay);
  historyChanged();
}

function nextState(scoringPlay) {
  var total = getScores()[scoringPlay.color].getTotal();
  if (total > 120) {
    return new GameOverState(scoringPlay.color);
  } else {
    return game.state.next(scoringPlay);
  }
}

/* ********* Game states ********* */

function BeforePeggingState(dealer) {
    this.name = "bp";
    this.dealer = dealer;
    
    this.next = function(play) {
       return new PeggingStartedState(this.dealer);
    }
    
    this.getCountingColor = function() {
      return this.dealer;
    }
    
    this.updateUI = function() {
      updateButtons(true, true, this.dealer, "Nobs");
    }
}

function PeggingStartedState(dealer) {
  this.name = "ps";
  this.dealer = dealer;

  this.next = function(play) {
    if (play.color === this.dealer) {
      return new DealerPeggedState(this.dealer);
    } else {
      return this;
    }
  };

  this.getCountingColor = function() {
    return swapColor(this.dealer);
  }

  this.updateUI = function() {
    updateButtons(true, false, swapColor(this.dealer), "Hand");
  };
}

function DealerPeggedState(dealer) {
  this.name = "dp";
  this.dealer = dealer;

  this.next = function(play) {
    if (play.type === "Hand") {
      return new FirstHandCountedState(this.dealer);
    } else {
      return this;
    }
  };

  this.getCountingColor = function() {
    return swapColor(this.dealer);
  };

  this.updateUI = function() {
    updateButtons(true, true, swapColor(this.dealer), "Hand");
  };
}

function FirstHandCountedState(dealer) {
  this.name = "fh";
  this.dealer = dealer;

  this.next = function(play) {
    return new SecondHandCountedState(this.dealer);
  };

  this.getCountingColor = function() {
    return this.dealer;
  };

  this.updateUI = function() {
    updateButtons(false, true, this.dealer, "Hand");
  };
}

function SecondHandCountedState(dealer) {
  this.name = "sh";
  this.dealer = dealer;

  this.getCountingColor = function() {
    return this.dealer;
  };

  this.next = function(play) {
    return new BeforePeggingState(swapColor(this.dealer));
  };

  this.updateUI = function() {
    updateButtons(false, true, this.dealer, "Crib");
  };
}

function GameOverState(winner) {
  this.name = "go";
  this.dealer = "";

  this.getCountingColor = function() {
    return null;
  };

  this.next = function() {
    return null;
  };

  this.updateUI = function() {
    addOverlay(
      {
        message: "Game Over",
        icon: "&#x1F3C6;",
        messageClass: winner + "Text"
      },
      false
    );
    localStorage.removeItem("currentCribbageGame");
    saveFinalScore();

    document.getElementById(winner + "triangle").style.display = "none";
    var goalElt = document.getElementById("goal");
    goalElt.classList.remove("disabled");
    goalElt.classList.add(winner + "winner");

    if (isSkunk()) {
      // Put skunk stuff here.
    }
  };

  this.undo = function() {
    document.getElementById(winner + "triangle").style.display = "inline-block";
    localStorage.removeItem("lastCribbageGame");
    var goalElt = document.getElementById("goal");
    goalElt.classList.add("disabled");
    goalElt.classList.remove(winner + "winner");
  };
}

function saveFinalScore() {
  var scores = getScores();
  var finalScores = {
    "red" : scores.red.getTotal(), 
    "blue" : scores.blue.getTotal()
  };
  localStorage.setItem("lastCribbageGame", JSON.stringify(finalScores));
}

function isSkunk() {
  var scores = getScores();
  return Math.abs(scores["red"].getTotal() - scores["blue"].getTotal()) > 30;
}

/* ********* History ********* */
function resolveState(stateObj) {
  if (stateObj.next) {
    return stateObj;
  }

  switch (stateObj.name) {
    case "bp":
      return new BeforePeggingState(stateObj.dealer);
    case "ps":
      return new PeggingStartedState(stateObj.dealer);
    case "dp":
      return new DealerPeggedState(stateObj.dealer);
    case "fh":
      return new FirstHandCountedState(stateObj.dealer);
    case "sh":
      return new SecondHandCountedState(stateObj.dealer);
  }
}

/* ********* UI Functions ********* */

function showBoard() {
  document.getElementById("startGame").style.display = "none";
  document.getElementById("playGame").style.display = "block";
}

function updateButtons(peggingEnabled, countingEnabled, countColor, countType) {
  document.getElementById("redPegButton").disabled = !peggingEnabled;
  document.getElementById("bluePegButton").disabled = !peggingEnabled;

  var countingButton = document.getElementById("handCribButton");
  countingButton.innerHTML = countType;
  countingButton.classList.remove(swapColor(countColor));
  countingButton.classList.add(countColor);
  countingButton.disabled = !countingEnabled;
}

function updateScoreboard() {
  var scores = getScores();
  var colors = Object.getOwnPropertyNames(scores);
  colors.forEach(function(color) {
    var types = Object.getOwnPropertyNames(scores[color]);
    types.forEach(function(type) {
      var typeScore = scores[color][type];
      document.getElementById(color + type).innerHTML = typeScore;
    });
  });
}

function movePeg() {
  var scores = getScores();
  var colors = Object.getOwnPropertyNames(scores);
  colors.forEach(function(color) {
    var total = scores[color].getTotal();
    var pct = Math.min(total*5/6,100);
    var pegarea = document.getElementById(color + "pegarea");
    pegarea.style.left = "" + pct + "%";
    var totalBox = document.getElementById(color + "score");
    
    var value = parseInt(totalBox.innerHTML);
    var diff = total-value;
    var delay = 1500/diff;
    if (diff > 0) {
      incrementTotalBox(totalBox, diff, delay);
    } else {
      totalBox.innerHTML = total;
    }
    
    // totalBox.innerHTML = total;
    
    // The scoreboard should move left relative to the arrow as the score
    // increases, to keep it above the scoring track rather than extending
    // off to the right.
    // There are 15 pixels at either end of the scoreboard that we will use
    // to make sure that the arrow (which is 12 pixels wide) stays within
    // the width of the scoreboard. So at score 0 the left position should
    // be -15, and at score 120 the left position should be 
    // 15-<scoreboard width>
    var scoreboard = document.getElementById(color + "scoreboard");
    var scoreboardWidth = scoreboard.offsetWidth;
    var scoreboardLeft = pct/100*(-scoreboardWidth+30)-15;
    scoreboard.style.left = "" + scoreboardLeft + "px";
  });
}

function incrementTotalBox(totalBox, inc, delay) {
  setTimeout(function() {
    var total = parseInt(totalBox.innerHTML);
    totalBox.innerHTML = total+1;
    if (inc > 1) {
      incrementTotalBox(totalBox, inc-1, delay);
    }
  }, delay);
}

function addToHistory(scoringPlay) {
  var oldHistoryElt = document.getElementById("currentscore");
  
  var newHistoryElt = oldHistoryElt.cloneNode(true);
  newHistoryElt.classList.add("historyoffscreen");
  // Blech...
  newHistoryElt.classList.remove("reddealer");
  newHistoryElt.classList.remove("bluedealer");
  setTimeout(function() {
    newHistoryElt.classList.remove("historyoffscreen");
  },1);
  
  oldHistoryElt.parentElement.insertBefore(newHistoryElt, oldHistoryElt);
  
  oldHistoryElt.removeAttribute("id");
  oldHistoryElt.classList.remove("historybig");
  oldHistoryElt.classList.add(scoringPlay.color + "historyitem");
  if (scoringPlay.type !== "Crib") {
      oldHistoryElt.classList.add("connecthand");
  }
  var details = oldHistoryElt.querySelector(".historydetails");
  setTimeout(function() {
    details.appendChild(buildHistoryNode(scoringPlay));
    details.style.maxWidth = "100px";
    details.style.minWidth = "1px";
    details.style.marginLeft = "5px";
  },200);

  
  oldHistoryElt.onclick = confirmUndo;
}

function buildHistoryNode(scoringPlay) {
  var elt = document.createElement("span");
  
  var type = document.createElement("span");
  //type.classList.add("historysmall");
  type.innerHTML = scoringPlay.type;
  elt.appendChild(type);
  
  if (scoringPlay.icon) {
    // This is just to get a margin between the type and the icon.
    type.classList.add("historyelt");

    var icon = document.createElement("span");
    icon.innerHTML = scoringPlay.icon;
    if (scoringPlay.iconClass) {
      icon.classList.add(scoringPlay.iconClass);
    }
    elt.appendChild(icon);
  }
  
  return elt;
}

function sliderMoved() {
  var bigSlider = document.getElementById("currentscore");
  bigSlider.querySelector(".currentvalue").innerHTML = document.getElementById("slider").value;
}

function fullscreen() {
  if (document.documentElement.requestFullscreen) {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }
}

function showClock() {
  var curTime = new Date();
  var hour = curTime.getHours();
  if (hour > 12) {
    hour = hour - 12;
  }

  var min = curTime.getMinutes();
  if (min < 10) {
    min = "0" + min;
  }
  document.getElementById("clock").innerHTML = hour + ":" + min;
  setTimeout(showClock, 2000);
}

function swapColor(color) {
  if (color === "red") {
    return "blue";
  } else {
    return "red";
  }
}

/* ********* Fun Stuff ********* */
function addIcon(play) {
  if (play.value >= 15) {
    play.icon = "&#x1F479;";
    play.message = "Monster!";
    if (play.color === "blue") {
      play.iconClass = "bluemonster";
    }
  } else if (play.type === "Crib" && play.value === 0) {
    play.icon = "&#x1F627";
    play.message = "Deep Sigh...";
  } else if (play.type === "Hand" && play.value < 5) {
    play.icon = "&#x1F60F";
    play.message = "Scoff";
  }
}

function addMessage(scoringPlay) {
  if (scoringPlay.message || scoringPlay.icon) {
    addOverlay(scoringPlay, true);
  }
}

var overlayActive = false;
var nextOverlay;
function addOverlay(message, temporary) {
  var overlay = document.getElementById("overlay");
  if (message && message.icon != "") {
    if (overlayActive) {
      window.nextOverlay = message;
    } else {
      var iconElt = document.getElementById("messageIcon");
      if (message.icon) {
        iconElt.innerHTML = message.icon;
      }
      if (message.iconClass) {
        iconElt.classList.add(message.iconClass);
      } else {
        iconElt.className = "";
      }
      var messageElt = document.getElementById("messageText");
      if (message.message) {
        messageElt.innerHTML = message.message;
      }
      if (message.messageClass) {
        messageElt.classList.add(message.messageClass);
      } else {
        messageElt.className = "";
      }
      overlay.style.display = "block";
      if (temporary) {
        window.overlayActive = true;
        setTimeout(function() {
          addOverlay(null);
        }, 1500);
      }
    }
  } else {
    removeOverlay();
  }
}

function removeOverlay() {
  var overlay = document.getElementById("overlay");
  overlay.style.display = "none";
  document.getElementById("messageIcon").innerHTML = "";
  document.getElementById("messageText").innerHTML = "";
  document.getElementById("messageText").setAttribute("class", "");
  window.overlayActive = false;
  if (nextOverlay) {
    addOverlay(window.nextOverlay);
    window.nextOverlay = null;
  }
}

function confirmUndo() {
  var undoSelection = confirm("Undo last play?");
  if (undoSelection) {
    undo();
  }
}
