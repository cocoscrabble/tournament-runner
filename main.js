import * as fs from "fs/promises";
import { parse } from "csv-parse/sync";
import { makeEntrants, makeResults } from "./results.js";


async function readCsvFile(input) {
  const data = await fs.readFile(input);
  const rows = parse(data);
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

var entrants = await readEntrants();
var results = await readResults();
console.log(entrants);
console.log(results);
