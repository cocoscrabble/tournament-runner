// -----------------------------------------------------
// Pairings
//

import { blossom } from "./blossom.js";

class Repeats {
  constructor() {
    this.matches = {}
  }

  add(name1, name2) {
    // Add a pairing and return the current count
    var key = [name1, name2].sort();
    if (this.matches[key] === undefined) {
      this.matches[key] = 0;
    }
    this.matches[key]++;
    return this.matches[key];
  }

  get(name1, name2) {
    var key = [name1, name2].sort();
    return this.matches[key] || 0;
  }
}

// -----------------------------------------------------
// Filter data based on round

function standingsAfterRound(res, entrants, round) {
  console.log("standings at round:", round);
  // Calculate standings as of round <round>
  if (round == 0) {
    return entrants.seeding.map(x => res.getPlayerResults(x.name))
  }
  var tmp_res = new Results();
  tmp_res.results = res.results.filter(function (r) { return r.round <= round; });
  tmp_res.processResults();
  var standings = Object.values(tmp_res.players);
  standings.sort(_player_standings_sort);
  standings = getCurrentEntrantsRanking(res, entrants, standings);
  return standings
}

function getFixedPairing(standings, p) {
  if (p.standing !== undefined) {
    return standings[p.standing - 1].name;
  } else {
    return p.name;
  }
}

function removeFixedPairings(standings, entrants, round) {
  var fp = entrants.fixed_pairings[round];
  console.log("round:", round);
  console.log("fp:", fp);
  if (fp === undefined) {
    return [standings, []];
  }
  var remove = {};
  var fixed = [];
  for (var pair of fp) {
    var p1 = getFixedPairing(standings, pair.first);
    var p2 = getFixedPairing(standings, pair.second);
    if (p1 != p2) {
      console.log("p1, p2:", [p1, p2]);
      [p1, p2] = [p1, p2].sort();
      console.log("sorted:", [p1, p2]);
      remove[p1] = p2;
      remove[p2] = p1;
      fixed.push({first: {name: p1}, second: {name: p2}});
    }
  }
  //console.log("pairing:", remove);
  standings = standings.filter(p => remove[p.name] === undefined);
  //console.log("new standings:", standings);
  return [standings, fixed];
}

function getCurrentEntrantsRanking(res, entrants, standings) {
  // Get standings only for people in current entrants list
  var ps = standings.filter(p => p.name in entrants.entrants);
  // Add standings for new entrants with no results
  var existing = ps.map(p => p.name);
  var newcomers = entrants.seeding.filter(p => existing.indexOf(p.name) == -1);
  newcomers = newcomers.map(p => res.getPlayerResults(p.name));
  console.log("newcomers:", newcomers);
  all = ps.concat(newcomers);
  return all
}

function pairingsAfterRound(res, entrants, repeats, round_pairings, round) {
  var standings;
  console.log("round_pairings:", round)
  var pair = round_pairings[round + 1];
  if (pair.type == "K") {
    standings = standingsAfterRound(res, entrants, round);
    return pairKoth(standings, entrants, round)
  } else if (pair.type == "Q") {
    standings = standingsAfterRound(res, entrants, round);
    return pairQoth(standings, entrants, round)
  } else if (pair.type == "R") {
    standings = standingsAfterRound(res, entrants, pair.start - 1);
    return pairRoundRobin(standings, pair.pos)
  } else if (pair.type.startsWith("QD")) {
    standings = standingsAfterRound(res, entrants, pair.start - 1);
    return pairDistributedQuads(standings, pair.pos);
  } else if (pair.type.startsWith("QC")) {
    standings = standingsAfterRound(res, entrants, pair.start - 1);
    return pairClusteredQuads(standings, pair.pos);
  } else if (pair.type.startsWith("QE")) {
    standings = standingsAfterRound(res, entrants, pair.start - 1);
    return pairEvansQuads(standings, pair.pos);
  } else if (pair.type == "CH") {
    return pairCharlottesville(entrants, round);
  } else if (pair.type == "S") {
    return pairSwiss(res, entrants, repeats, round, round + 1);
  } else if (pair.type == "ST") {
    return pairSwiss(res, entrants, repeats, round - 1, round + 1);
  }
}
// -----------------------------------------------------
// Round robin pairing.
// See https://github.com/domino14/liwords/ for strategy

function _pairRR(n, r) {
  // Pair n players at round r
  var init = Array.from({ length: n - 1 }, (_, i) => i + 1);
  var h = n / 2;
  //var start = (r * (n - 3)) % (n - 1);
  var start = n - 1 - r;
  var r1 = init.slice(0, start);
  var r2 = init.slice(start);
  var rotated = [0].concat(r2, r1);
  var h1 = rotated.slice(0, h);
  var h2 = rotated.slice(h).reverse();
  return [h1, h2];
}

function pairRoundRobin(standings, pos) {
  // Pair for game #pos in the round robin
  var n = standings.length;
  var pairings = [];
  var [h1, h2] = _pairRR(n, pos - 1);
  for (var i = 0; i < standings.length / 2; i += 1) {
    pairings.push({ first: standings[h1[i]], second: standings[h2[i]] });
  }
  return pairings
}

// -----------------------------------------------------
// King of the hill pairing.

function pairKoth(standings, entrants, round) {
  // Sort by wins and spread
  var fixed
  [standings, fixed] = removeFixedPairings(standings, entrants, round + 1);
  var pairings = [];
  for (var i = 0; i < standings.length; i += 2) {
    pairings.push({ first: standings[i], second: standings[i + 1] })
  }
  for (var p of fixed) {
    pairings.push(p);
  }
  return pairings
}

// -----------------------------------------------------
// Queen of the hill pairing.

function pairQoth(standings, entrants, round) {
  // Sort by wins and spread
  var fixed
  [standings, fixed] = removeFixedPairings(standings, entrants, round + 1);
  var pairings = [];
  var n = standings.length;
  if (n % 4 == 2) {
    last = n - 6
    for (var i = 0; i < last; i += 4) {
      pairings.push({ first: standings[i], second: standings[i + 2] })
      pairings.push({ first: standings[i + 1], second: standings[i + 3] })
    }
    // Pair the last six players 1-4,2-5,3-6 if we don't have a multiple of 4
    pairings.push({ first: standings[last + 0], second: standings[last + 3] })
    pairings.push({ first: standings[last + 1], second: standings[last + 4] })
    pairings.push({ first: standings[last + 2], second: standings[last + 5] })
  } else {
    for (var i = 0; i < n; i += 4) {
      pairings.push({ first: standings[i], second: standings[i + 2] })
      pairings.push({ first: standings[i + 1], second: standings[i + 3] })
    }
  }
  for (var p of fixed) {
    pairings.push(p);
  }
  return pairings
}

// -----------------------------------------------------
// Quad pairing.

// We assume there are always an even number of players (one of whom might be 'bye'),
// but there might not be a divisible-by-four number. If there are 4n+2 players, we
// divide them into (n-1) quads and a final hex, and pair the hex separately in a
// group of 3 games.

// Quad pairings for four players, 0-3
const Pairings4 = [
  [[0, 3], [1, 2]],
  [[0, 2], [1, 3]],
  [[0, 1], [2, 3]]
]

// Incomplete round robin for 6 players, 0-5
const Pairings6 = [
  [[0, 1], [2, 3], [4, 5]],
  [[0, 2], [3, 4], [1, 5]],
  [[0, 3], [1, 4], [2, 5]]
]

function groupPositionPairs(group, pos) {
  if (group.length == 4) {
    return Pairings4[pos - 1]
  } else {
    return Pairings6[pos - 1]
  }
}

function pairGroupsAtPosition(groups, pos) {
  var pairings = [];
  for (i = 0; i < groups.length; i++) {
    const group = groups[i];
    var p = groupPositionPairs(group, pos);
    for (let [a, b] of p) {
      pairings.push({ first: group[a], second: group[b] });
    }
  }
  return pairings;
}

function getLastQuadPosition(standings) {
  var leftover = standings.length % 4;
  console.log("leftover:", leftover);
  if (leftover == 0) {
    return standings.length
  } else if (leftover == 2) {
    return standings.length - 6
  }
}

function maybeAddHex(quads, standings, max) {
  // we have a leftover hex, add it to the quads
  if (max < standings.length) {
    quads.push(standings.slice(max, standings.length))
  }
}

function pairClusteredQuads(standings, pos) {
  var quads = [];
  var max = getLastQuadPosition(standings);
  for (var i = 0; i < max; i += 4) {
    quads.push(standings.slice(i, i + 4));
  }
  maybeAddHex(quads, standings, max);
  return pairGroupsAtPosition(quads, pos);
}

function pairDistributedQuads(standings, pos) {
  var quads = [];
  var max = getLastQuadPosition(standings);
  var stride = max / 4;
  for (var i = 0; i < stride; i++) {
    quads[i] = [];
  }
  for (var i = 0; i < max; i++) {
    var quad = i % stride;
    quads[quad].push(standings[i]);
  }
  maybeAddHex(quads, standings, max);
  console.log("quads:", quads)
  console.log("standings:", standings)
  return pairGroupsAtPosition(quads, pos);
}

function pairEvansQuads(standings, pos) {
  // Like distributed quads but flip every other subgroup first,
  // so that the sum of opponent seeds ends up roughly equal.
  // e.g. for 12 people you would make quads from
  // 1 2 3 6 5 4 7 8 9 12 11 10
  var quads = [];
  var max = getLastQuadPosition(standings);
  var stride = max / 4;
  for (var i = 0; i < stride; i++) {
    quads[i] = [];
  }

  // Generate new standings snake-style
  var new_standings = []
  var flip = false;
  for (var i = 0; i < max; i += stride) {
    var slice = standings.slice(i, i + stride);
    if (flip) {
      slice.reverse();
    }
    flip = !flip;
    new_standings = new_standings.concat(slice)
  }

  // Make quads from the new standings
  for (var i = 0; i < max; i++) {
    var quad = i % stride;
    quads[quad].push(new_standings[i]);
  }
  maybeAddHex(quads, standings, max);
  return pairGroupsAtPosition(quads, pos);
}

// -----------------------------------------------------
// Charlottesville pairing.

// Split the field into 2 groups in a snake order.
// Group 1: 1, 4, 5, 8, 9, 12, 13, 16, 17
// Group 2: 2, 3, 6, 7, 10, 11, 14, 15, 18
// For the first 9 rounds, you play a round robin against all the people in the *other* group.

function pairCharlottesville(entrants, round) {
  var g1 = [];
  var g2 = [];
  for (var i = 1; i <= entrants.seeding.length; i += 1) {
    if (i % 4 == 0 || i % 4 == 1) {
      g1.push(i);
    } else {
      g2.push(i);
    }
  }
  // reverse group 2 so the top player plays the second player last
  g2.reverse();
  // rotate group 2 one place per round and pair up with group 1
  var r = round - 1;
  var r1 = g2.slice(0, r);
  var r2 = g2.slice(r);
  var rotated = r2.concat(r1);
  var pairings = [];
  for (var i = 0; i < g1.length; i += 1) {
    p1 = g1[i] - 1;
    p2 = rotated[i] - 1;
    pairings.push({ first: entrants.seeding[p1], second: entrants.seeding[p2] });
  }
  return pairings
}

// -----------------------------------------------------
// Swiss pairing.

function calculateScoreGroups(standings) {
  var groups = []
  for (var p of standings) {
    var k = p.wins
    if (groups[k] === undefined) {
      groups[k] = []
    }
    groups[k].push(p)
  }
  groups = groups.filter(e => !!e).reverse()
  // Balance groups
  var curr, next
  for (var i = 0; i < groups.length - 1; i++) {
    [curr, next] = [groups[i], groups[i + 1]]
    if (curr.length % 2 != 0) {
      var fst = next.shift();
      curr.push(fst);
    }
  }
  groups = groups.filter(e => e.length != 0)
  return groups;
}

function promote(groups, i, j) {
  var top = groups[j]
  if (top === undefined) {
    console.log("undef!")
    console.log(groups)
    console.log(j)
  }
  var fst = groups[j].shift();
  groups[i].push(fst)
}

function promote2(groups, i) {
  console.log("promoting two into", i);
  var j = i + 1
  promote(groups, i, j);
  if (groups[j].length == 0) {
    promote(groups, i, j + 1)
  } else {
    promote(groups, i, j)
  }
}

function mergeBottom(groups) {
  console.log("merging bottom two groups");
  if (groups.length == 1) {
    console.log("only one group, bailing out!")
  }
  var last = groups.length - 1;
  groups[last - 1] = groups[last - 1].concat(groups[last]);
  groups[last] = [];
}

function pairSwissInitial(standings) {
  var pairings = [];
  const half = standings.length / 2;
  for (var i = 0; i < half; i++) {
    pairings.push({ first: standings[i], second: standings[i + half] })
  }
  return pairings
}

function pairSwissTop(groups, repeats, nrep) {
  var top = groups[0];
  var candidates = [];
  for (var i = 0; i < top.length; i++) {
    candidates[i] = [];
    for (var j = 0; j < top.length; j++) {
      if (i == j) {
        continue;
      }
      var reps = repeats.get(top[i].name, top[j].name);
      if (reps < nrep) {
        candidates[i].push([reps, Math.abs(i - j), top[j].name, top[i].name])
      }
    }
  }
  for (var i = 0; i < candidates.length; i++) {
    candidates[i] = candidates[i].sort()
  }
  return candidates
}

function pairCandidates(bracket) {
  // console.log("candidates", candidates);
  var edges = [];
  var names = {};
  var inames = {};
  var i = 0;
  for (var player of bracket) {
    let name = player[0][3]
    names[name] = i;
    inames[i] = name;
    i++;
  }
  // console.log("names", names)
  console.log("inames", inames)

  for (var player of bracket) {
    for (var m of player) {
      const [repeats, distance, p1, p2] = m;
      // Don't pair candidates too far apart
      if (distance < 11) {
        let weight = -(30 * repeats + distance);
        let v1 = names[p1];
        let v2 = names[p2];
        edges.push([v1, v2, weight])
      }
    }
    // var name = player[0][3]
    // console.log(name, player.length, player)
  }
  // console.log("edges:", edges)
  var b = blossom(edges, true)
  console.log("blossom:", b)
  var pairings = []
  for (var i = 0; i < b.length; i++) {
    let v = b[i];
    let p1 = inames[i];
    let p2 = inames[v];
    pairings.push({ first: { name: p1 }, second: { name: p2 } })
  }
  console.log("sub pairing:", pairings)
  return pairings
}

function pairSwiss(results, entrants, repeats, round, for_round, ) {
  console.log("swiss pairing based on round", round)
  if (round <= 0) {
    return pairSwissInitial(entrants.seeding);
  }
  //console.log("repeats for round", round, repeats.matches)
  var players = standingsAfterRound(results, entrants, round);
  var fixed;
  [players, fixed] = removeFixedPairings(players, entrants, for_round);
  var groups = calculateScoreGroups(players);
  var dgroups = groups.map(g => g.map(p => [p.name, p.wins]));
  console.log("groups:", dgroups)
  var candidates;
  var nrep = 1;
  var paired = [];
  // Don't have too small a bottom group
  if (groups.length > 1) {
    while (groups[groups.length - 1].length < 6) {
      mergeBottom(groups);
      groups = groups.filter(e => e.length != 0);
    }
  }
  while (groups.length > 0) {
    dgroups = groups.map(g => g.map(p => [p.name, p.wins]));
    console.log("groups:", dgroups)
    candidates = pairSwissTop(groups, repeats, nrep)
    //console.log("candidates:", candidates)
    if (candidates.some(e => e.length == 0)) {
      if (groups.length == 1) {
        console.log("failed!")
        nrep += 1;
        console.log("reps:", nrep);
        continue;
      }
      promote2(groups, 0)
      groups = groups.filter(e => e.length != 0)
      if (groups.length == 1) {
        console.log("failed! after promotion")
        nrep += 1;
        console.log("reps:", nrep);
        continue;
      }
    } else {
      var pairs = pairCandidates(candidates)
      if (pairs.some(e => e.second.name === undefined)) {
        console.log("unpaired!")
        nrep += 1;
        console.log("reps:", nrep);
        continue;
      }
      groups.shift()
      paired.push(pairs);
      if (groups.length == 0) {
        break;
      }
    }
  }
  console.log("fixed:", fixed)
  paired.push(fixed);
  var out = []
  for (const group of paired) {
    for (var p of group) {
      if (p.first.name < p.second.name) {
        p.repeats = repeats.get(p.first.name, p.second.name)
        out.push(p)
      }
    }
  }
  console.log("out:", out)
  return out
}
