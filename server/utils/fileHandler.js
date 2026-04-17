const fs = require('fs-extra')
const path = require('path')

// Absolute path to the JSON file used as the lightweight data store.
const dbPath = path.join(__dirname, '../database/db.json')

// Read and parse the JSON database file.
const readData = async () => {
  const data = await fs.readJson(dbPath)
  return data
}

// Write the full data object back to disk with pretty formatting.
const writeData = async (data) => {
  await fs.writeJson(dbPath, data, { spaces: 2 })
}

module.exports = { readData, writeData }