// -----------------------------------------------------
// Output pairings and standings

function _player_standings_sort(x, y) {
  if (x.score == y.score) {
    return (y.spread - x.spread);
  } else {
    return (y.score - x.score);
  }
}

function outputPlayerStandings(standing_sheet, score_dict, entrants, ratings) {
  // Sort by wins and spread
  var standings = Object.values(score_dict);
  standings.sort(_player_standings_sort);
  standings = standings.filter(x => x.name.toLowerCase() != "bye");
  standings = standings.filter(x => !x.name.includes("bye"));
  var out = standings.map(function (x, index) {
    var full_name = entrants.entrants[x.name] || x.name;
    var rating = ratings[x.name]
    return [
      (index + 1) + ".",
      full_name,
      x.wins + 0.5 * x.ties,
      x.losses + 0.5 * x.ties,
      x.spread,
      rating
    ]
  })

  // Write out standings starting in cell A2
  var outputRow = 2;
  var outputCol = 1;
  if (standings.length == 0) {
    return;
  }
  var outputRange = standing_sheet.getRange(outputRow, outputCol, out.length, out[0].length);
  outputRange.setValues(out);
}

function outputPairings(pairing_sheet, text_pairing_sheet, pairings, entrants, round, start_row) {
  console.log("pairings:", pairings);
  var vtable = 1;
  var used = new Set();
  for (var v of Object.values(entrants.tables)) {
    used.add(v)
  }
  var out = pairings.map(function (x, index) {
    var table;
    if (x.first.name in entrants.tables) {
      table = entrants.tables[x.first.name];
    } else if (x.second.name in entrants.tables) {
      table = entrants.tables[x.second.name];
    } else {
      while (used.has(vtable)) {
        vtable++;
      }
      table = vtable;
      vtable++;
    }
    var first = x.first.start ? x.first.name : x.second.name;
    var second = x.first.start ? x.second.name : x.first.name;
    var rep = x.repeats > 1 ? `(rep ${x.repeats})` : "";
    return [
      table,
      entrants.entrants[first] || first,
      entrants.entrants[second] || second,
      rep,
    ]
  })
  out = out.sort((a, b) => parseInt(a) - parseInt(b));
  var ncols = out[0].length
  var text_pairings = []
  var round_header = "ROUND " + (round + 1);
  var pairing_strings = pairings.map(x => `${x.first.name} v. ${x.second.name}`);
  var pairing_string = round_header + ": " + pairing_strings.join(" | ");
  text_pairings.push([pairing_string])
  var header = [
    [round_header, "", "", ""],
  ];
  out = header.concat(out);
  // Write out standings starting in cell A2
  var outputRow = start_row;
  var outputCol = 1;
  var outputRange = pairing_sheet.getRange(outputRow, outputCol, out.length, ncols);
  outputRange.setValues(out);
  outputRange.setFontWeight("normal");
  var headerRange = pairing_sheet.getRange(outputRow, outputCol, header.length, ncols);
  headerRange.setFontWeight("bold");
  var textPairingRange = text_pairing_sheet.getRange(round + 1, 1, 1, 1);
  textPairingRange.setValues(text_pairings);
}

function processSheet(input_sheet_label, standings_sheet_label, pairing_sheet_label, text_pairing_sheet_label) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var result_sheet = sheet.getSheetByName(input_sheet_label);

  var res = collectResults(result_sheet);

  var entrants = collectEntrants();
  var ratings = {};
  for (var x of entrants.seeding) {
    ratings[x.name] = x.rating
  }
  var fp = collectFixedPairings();
  entrants.fixed_pairings = fp;

  console.log("processed results");


  // Write out the standings
  var standings_sheet = sheet.getSheetByName(standings_sheet_label);
  outputPlayerStandings(standings_sheet, res.players, entrants, ratings);

  // Write out the pairings
  var round_pairings = collectRoundPairings();
  console.log("round pairings:", round_pairings);

  // Find the last round we can pair
  var round_ids = res.roundIds();
  console.log("round ids:", round_ids);
  var last_result = Math.max(...round_ids);
  var last_round = 0;
  for (var r of Object.values(round_pairings)) {
    if (r.start - 1 <= last_result) {
      console.log("Pairing round", r, "based on round", r.start);
      last_round = r.round;
    }
  }
  console.log("Last round", last_round);

  var pairing_sheet = sheet.getSheetByName(pairing_sheet_label);
  var text_pairing_sheet = sheet.getSheetByName(text_pairing_sheet_label);

  // Clear pairing sheets
  pairing_sheet.clearContents();
  text_pairing_sheet.clearContents();

  var row = 2;
  var rr_starts = {}
  var repeats = new Repeats();
  for (var i = 0; i < last_round; i++) {
    var rp = round_pairings[i + 1];
    console.log("writing pairings for round:", i + 1, rp);
    var pairings;
    if (i + 1 < round_ids.length) {
      pairings = res.extractPairings(i + 1)
    } else {
      pairings = pairingsAfterRound(res, entrants, repeats, round_pairings, i);
      for (var p of pairings) {
        var p1 = p.first.name;
        var p2 = p.second.name;
        var p1_first;
        if (rp.type == "R" || rp.type == "CH") {
          if (rr_starts[p1] === undefined) {
            rr_starts[p1] = 0
          }
          if (rr_starts[p2] === undefined) {
            rr_starts[p2] = 0
          }
          // Always assign 'bye' the first otherwise the player playing the bye
          // is assigned an extra first andthereby slightly penalised.
          if (p1.toLowerCase() === "bye") {
            p1_first = true;
          } else if (p2.toLowerCase() === "bye") {
            p1_first = false;
          } else {
            p1_first = rr_starts[p1] <= rr_starts[p2];
          }
          if (p1_first) {
            rr_starts[p1]++;
          } else {
            rr_starts[p2]++;
          }
        } else {
          if (p1.toLowerCase() === "bye") {
            p1_first = true;
          } else if (p2.toLowerCase() === "bye") {
            p1_first = false;
          } else {
            p1_first = res.players[p1].starts <= res.players[p2].starts;
          }
        }
        p.first.start = p1_first;
        p.second.start = !p1_first;
      }
    }
    for (var p of pairings) {
      p.repeats = repeats.add(p.first.name, p.second.name);
    }
    outputPairings(pairing_sheet, text_pairing_sheet, pairings, entrants, i, row);
    row += pairings.length + 2;
  }
}

function calculateStandings() {
  processSheet("Results", "Standings", "Pairings", "Text Pairings");
}

// export {
//   makeEntrants, makeRoundPairings, makeResults, pairingsAfterRound,
//   standingsAfterRound
// };
