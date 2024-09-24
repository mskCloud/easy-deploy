import { existsSync, mkdirSync, readdir, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { renderFile } from 'ejs'
import { failLog, successLog } from '../tools/index.js'

const deployDir = join(resolve(), '/deploy')
const templatesDir = resolve(import.meta.dirname, '../templates')

const initTemplate = async () => {
    const sourceDir = templatesDir
    const targetDir = deployDir
    if (!existsSync(targetDir)) {
        mkdirSync(targetDir)
    }

    const promises = []
    readdir(sourceDir, (err, files) => {
        if (err) {
            failLog('默认模版没有找到')
            throw err
        }
        files.forEach((file) => {
            promises.push(
                renderFile(join(sourceDir, file)).then((data) => {
                    successLog(`+ ${file}`)
                    writeFileSync(join(targetDir, file), data)
                })
            )
        })
    })
    return Promise.all(promises)
        .then(() => {
            successLog('模版初始化完成')
        })
        .catch((err) => {
            failLog('模版初始化出错', err)
            throw err
        })
}

function init() {
    initTemplate()
}

export default init
