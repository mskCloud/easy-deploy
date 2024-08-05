const fs = require("fs")
const path = require("path")
const ejs = require("ejs")
const { failLog, successLog } = require("../tools/index.js")

const deployDir = path.join(path.resolve(), "/deploy")
const templatesDir = path.join(path.resolve(), "/templates")

const initTemplate = async () => {
  const sourceDir = templatesDir
  const targetDir = deployDir
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir)
  }

  const promises = []
  fs.readdir(sourceDir, (err, files) => {
    if (err) {
      failLog("默认模版没有找到")
      throw err
    }
    files.forEach((file) => {
      promises.push(
        ejs.renderFile(path.join(sourceDir, file)).then((data) => {
          successLog(`+ ${file}`)
          fs.writeFileSync(path.join(targetDir, file), data)
        })
      )
    })
  })
  return Promise.all(promises)
    .then(() => {
      successLog("模版初始化完成")
    })
    .catch((err) => {
      failLog("模版初始化出错", err)
      throw err
    })
}

function init() {
  initTemplate()
}

module.exports = init
