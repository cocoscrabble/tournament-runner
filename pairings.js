

function makeRoundPairings(rows) {
  var quads = {}
  var round_robins = {}
  var rounds = []
  for (var entry of rows) {
    // col A = entry[0], B = 1
    var round = parseInt(entry[0]);
    var pairing = entry[1];
    if (pairing.startsWith("Q")) {
      if (quads[pairing] === undefined) {
        quads[pairing] = [];
      }
      quads[pairing].push(round);
    } else if (pairing.startsWith("R")) {
      if (round_robins[pairing] === undefined) {
        round_robins[pairing] = [];
      }
      round_robins[pairing].push(round);
    } else if (pairing == "CH") {
      rounds[round] = { round: round, type: pairing, start: 0 };
    } else if (pairing == "ST") {
      rounds[round] = { round: round, type: pairing, start: round - 1 };
    } else {
      rounds[round] = { round: round, type: pairing, start: round };
    }
  }
  for (const q of Object.keys(quads)) {
    const quad = quads[q];
    for (i = 0; i < quad.length; i++) {
      round = quad[i];
      rounds[round] = { round: round, type: q, start: quad[0], pos: i + 1 }
    }
  }
  for (const r of Object.keys(round_robins)) {
    const rr = round_robins[r];
    for (i = 0; i < rr.length; i++) {
      round = rr[i];
      rounds[round] = { round: round, type: "R", start: rr[0], pos: i + 1 }
    }
  }
  return rounds;
}

function parseFixedPairing(p) {
  if (p.startsWith("#")) {
    return { standing: parseInt(p.slice(1)) };
  } else {
    const regex = /\s\(.*$/;
    p = p.replace(regex, '');
    return { name: p };
  }
}

function makeFixedPairings(rows) {
  var fp = {};
  for (var entry of rows) {
    var round = parseInt(entry[0]);
    var p1 = parseFixedPairing(entry[1]);
    var p2 = parseFixedPairing(entry[2]);
    if (fp[round] === undefined) {
      fp[round] = [];
    }
    fp[round].push({first: p1, second: p2})
  }
  return fp;
}
