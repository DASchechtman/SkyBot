const fs = require('fs')

const path = './.out/token.json'
x = JSON.parse(fs.readFileSync(path))
x["debug-mode"] = false
fs.writeFileSync(path, JSON.stringify(x))