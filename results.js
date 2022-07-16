// -----------------------------------------------------
// Tournament entrants and results data.

export class Results {
  constructor() {
    this.results = []
    this.players = {}
    this.rounds = {}
  }

  updateRound(game_result) {
    var round = game_result.round
    if (this.rounds[round] === undefined) {
      this.rounds[round] = []
    }
    this.rounds[round].push(game_result)
  }

  getPlayerResults(name) {
    if (this.players[name] === undefined) {
      this.players[name] = {
        name: name,
        wins: 0,
        losses: 0,
        ties: 0,
        score: 0,
        spread: 0,
        starts: 0,
      }
    }
    return this.players[name];
  }

  updatePlayer(result) {
    // Add the result of a single game to the player's results
    var p = this.getPlayerResults(result.name)
    var spread = result.score - result.opp_score
    p.spread += spread;
    if (spread > 0) {
      p.wins += 1;
    } else if (spread == 0) {
      p.ties += 1;
    } else {
      p.losses += 1;
    }
    p.score = p.wins + 0.5 * p.ties;
    p.starts += result.start;
  }

  addGeneratedResult(game_result) {
    // Used for simulations
    this.results.push(game_result);
    this.processResult(game_result);
  }
  
  processResult(game_result) {
    var winner = winnerResults(game_result);
    var loser = loserResults(game_result);
    this.updatePlayer(winner);
    this.updatePlayer(loser);
    this.updateRound(game_result);
  }

  processResults() {
    for (const game_result of this.results) {
      this.processResult(game_result);
    }
  }

  roundIds() {
    return [0].concat(Object.keys(this.rounds).map(function (i) {
      return parseInt(i);
    }));
  }

  extractPairings(round) {
    var pairings = [];
    console.log("extracting pairings for round:", round)
    console.log(this.rounds[round])
    for (const game_result of this.rounds[round]) {
      var pairing = {
        first: {name: game_result.winner, start: game_result.winner_first},
        second: {name: game_result.loser, start: !game_result.winner_first}
      }
      pairings.push(pairing);
    }
    return pairings
  }
}

export class Entrants {
  constructor(entrants, seeding, tables, fixed_pairings) {
    this.entrants = entrants
    this.seeding = seeding
    this.tables = tables
    this.fixed_pairings = fixed_pairings
  }

  addEntrant(e) {
    this.entrants[e.name] = e.full_name;
    this.seeding.push({ name: e.name, rating: e.rating, seed: e.seed });
    if (e.table != "") {
      this.tables[e.name] = parseInt(e.table);
    }
  }
}

function winnerResults(game_result) {
  var start = game_result.winner_first ? 1 : 0;
  return {
    round: game_result.round,
    name: game_result.winner,
    score: game_result.winner_score,
    opp: game_result.loser,
    opp_score: game_result.loser_score,
    start: start,
  }
}

function loserResults(game_result) {
  var start = game_result.winner_first ? 0 : 1;
  return {
    round: game_result.round,
    name: game_result.loser,
    score: game_result.loser_score,
    opp: game_result.winner,
    opp_score: game_result.winner_score,
    start: start,
  }
}

function makeResults(rows) {
  // Convert each row into a GameResult object
  var out = []
  for (var entry of rows) {
    // col B = entry[0], C = 1, ...
    var game_result = {
      round: parseInt(entry[0]),
      winner: entry[1],
      winner_score: parseInt(entry[2]),
      loser: entry[3],
      loser_score: parseInt(entry[4]),
      winner_first: entry[5].toLowerCase() == "first" ? true : false,
    }
    // make sure we have a valid round number, and ignore "test player"
    if (!isNaN(game_result.round) && (game_result.winner != "Test Player")) {
      out.push(game_result);
    }
  }
  var res = new Results();
  res.results = out;
  res.processResults();
  return res;
}

function entrantFromRow(entry) {
  // col B = entry[0], C = 1, ...
  var name = entry[0];
  var rating = parseInt(entry[1]);
  var table = entry[3];
  var seed = parseInt(entry[4]);
  var full_name = name + ` (#${seed})`;
  if (isNaN(rating)) {
    rating = 0;
  }
  return {name: name, full_name: full_name, rating: rating, table: table, seed: seed}
}

function makeEntrants(rows) {
  var entrants = {}
  var seeding = []
  var tables = {}
  var fixed_pairings = {}
  var ret = new Entrants(entrants, seeding, tables, fixed_pairings);
  for (var entry of rows) {
    ret.addEntrant(entrantFromRow(entry));
  }
  ret.seeding.sort(function (i, j) { return i.seed - j.seed });
  return ret;
}

