import { existsSync, mkdirSync, readdir, writeFileSync, writeFile, readFile, createReadStream } from 'fs'
import readline from 'readline'
import { join, resolve } from 'path'
import { renderFile } from 'ejs'
import { failLog, successLog, useCurrentPosition } from '../tools/index.js'

const initTemplate = async () => {
    const { dirname } = useCurrentPosition(import.meta.url)
    const deployDir = resolve(process.cwd(), './deploy')
    const templatesDir = resolve(dirname, '../templates')
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

const ignore = 'deploy'
const addGitignore = async (filePath) => {
    writeFile(filePath, ignore, (error) => {
        if (error) {
            failLog('.gitignore 创建失败', error)
        }
        successLog('.gitignore 创建完成')
    })
}

const patchGitignore = async (filePath) => {
    const isExist = await new Promise((resolve) => {
        const rl = readline.createInterface({
            input: createReadStream(filePath),
            output: process.stdout,
            terminal: false,
        })
        let res = false
        rl.on('line', (line) => {
            if (line === ignore) {
                res = true
                rl.close()
            }
        })
        rl.on('close', () => {
            resolve(res)
        })
    })

    if (!isExist) {
        const content = await new Promise((resolve) => {
            readFile(filePath, 'utf-8', (error, data) => {
                if (error) {
                    failLog('.gitignore 读取失败', error)
                    throw error
                }
                resolve(data)
            })
        })
        writeFile(filePath, content + '\n' + ignore + '\n', (error) => {
            if (error) {
                failLog('.gitignore 编辑失败', error)
                throw error
            }
            successLog(`已将 ${ignore} 添加至 .gitignore`)
        })
    }
}

const checkGitignore = async () => {
    const gitignorePath = resolve(process.cwd(), '.gitignore')
    if (existsSync(gitignorePath)) {
        patchGitignore(gitignorePath)
    } else {
        addGitignore(gitignorePath)
    }
}

function init(option) {
    initTemplate()
    if (option.skip) {
        return
    }
    checkGitignore()
}

export default init
