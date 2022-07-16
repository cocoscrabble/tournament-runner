import * as fs from "fs/promises";
import { parse } from "csv-parse/sync";
import { makeEntrants, makeResults } from "./results.js";
import { makeRoundPairings } from "./pairings.js";


async function readCsvFile(input) {
  const data = await fs.readFile(input);
  const rows = parse(data, {from_line: 2});
  return rows;
}

async function readResults() {
  var rows = await readCsvFile("./osc-2022-results.csv");
  return makeResults(rows);
}

async function readEntrants() {
  var rows = await readCsvFile("./osc-2022-ratings.csv");
  return makeEntrants(rows);
}

async function readRoundPairings() {
  var rows = await readCsvFile("./round-pairings.csv");
  return makeRoundPairings(rows);
}

var entrants = await readEntrants();
var results = await readResults();
var round_pairings = await readRoundPairings();
console.log(round_pairings)
console.log(entrants)
