const fs = require('fs')

const path = './.out/token.json'
const tokenInfo = JSON.parse(fs.readFileSync(path))
tokenInfo["debug-mode"] = false
fs.writeFileSync(path, JSON.stringify(tokenInfo))