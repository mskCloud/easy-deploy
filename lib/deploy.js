import { resolve as _resolve, join } from 'path'
import { existsSync, rm, createWriteStream } from 'fs'
import { execSync } from 'child_process'
import { NodeSSH } from 'node-ssh'
import archiver from 'archiver'
import ora from 'ora'
import { getCurrentDate, logStep } from '../tools/index.js'

const ssh = new NodeSSH()
let currentConfig = null
let exeStep = 1

const patchNameAndPath = (fileInfo, type) => {
    if (!fileInfo) {
        return
    }
    let { distName = '', distPath = '', isRetain = false, zipName = '', zipPath = '' } = fileInfo
    const zipType = 'zip'
    let distPathFull = ''
    let zipPathFull = ''

    if (!distPath) {
        logStep(exeStep, '配置deploy.config: 缺少文件夹路径', 'fail')
        process.exit(1)
    }

    // 获取文件夹名，如果没有配置，则从路径中寻找
    if (!distName) {
        let i = distPath.lastIndexOf('/')
        if (!i) {
            i = 0
        }
        distName = distPath.slice(i + 1)
        if (!distName) {
            logStep(exeStep, '配置deploy.config: 找不到文件夹', 'fail')
            process.exit(1)
        }
    }

    if (isRetain) {
        zipName = zipName + `-[${getCurrentDate()}].${zipType}`
    } else {
        zipName = zipName + `.${zipType}`
    }

    if (!zipPath.endsWith('/')) {
        zipPath += '/'
    }
    zipPath = zipPath + zipName

    if (type === 'local') {
        try {
            distPathFull = _resolve(join(process.cwd(), '/deploy'), distPath)
            zipPathFull = _resolve(join(process.cwd(), '/deploy'), zipPath)
        } catch (err) {
            logStep(exeStep, '本地zip查找失败', 'fail')
            process.exit(1)
        }
    }

    return {
        distName,
        distPath,
        distPathFull,
        isRetain,
        zipName,
        zipPath,
        zipPathFull,
    }
}

const rmLocalFiles = async (filePath, type) => {
    const isExist = existsSync(filePath)
    if (!isExist) {
        return Promise.resolve(true)
    }
    return new Promise((resolve, reject) => {
        rm(filePath, { recursive: type === 'dir' }, (err) => {
            if (err) {
                reject(false)
                return
            }
            resolve(true)
        })
    })
}

const loadConfig = async (config, env) => {
    if (!Array.isArray(config)) {
        logStep(exeStep, '配置deploy.config: config需要为Array类型', 'fail')
        process.exit(1)
    }

    try {
        currentConfig = config.find((f) => f.name === env)
    } catch (error) {
        logStep(exeStep, '配置deploy.config: config错误', 'fail')
        throw error
    }

    if (!currentConfig) {
        logStep(exeStep, `配置deploy.config: ${env}命令读取失败，请确认${env}是否与配置项中name一致`, 'fail')
        process.exit(1)
    }

    try {
        currentConfig.local = patchNameAndPath(currentConfig.local, 'local')
        currentConfig.remote = patchNameAndPath(currentConfig.remote)
    } catch (err) {
        logStep(exeStep, `配置deploy.config: patch失败`, 'fail')
        throw err
    }
    logStep(exeStep, '配置文件加载成功')
    return currentConfig
}

// 使用script进行项目打包
const execBuild = async (envConfig) => {
    const { script } = envConfig
    const spinner = ora(`命令${script} 执行中`)
    try {
        spinner.start()
        const startDate = new Date().getTime()
        execSync(script)
        const endDate = new Date().getTime()
        spinner.stop()
        logStep(exeStep, `命令${script} 执行成功: 共${(endDate - startDate) / 1000}s`)
    } catch (error) {
        spinner.stop()
        logStep(exeStep, `命令${script} 执行失败`, 'fail')
        throw error
    }
}

// 删除本地dist目录
const removeLocalDist = async (envConfig) => {
    const { local } = envConfig
    const res = await rmLocalFiles(local.distPathFull, 'dir')
    if (res) {
        logStep(exeStep, `本地${local.distName}文件夹删除成功`)
    } else {
        logStep(exeStep, `本地${local.distName}文件夹删除失败`, 'fail')
    }
}

// 删除本地压缩包
const removeLocalZip = async (envConfig) => {
    const { local } = envConfig
    const res = await rmLocalFiles(local.zipPathFull)
    if (!res) {
        logStep(exeStep, `本地${local.zipName}删除失败`, 'fail')
    } else {
        logStep(exeStep, `本地${local.zipName}删除成功`)
    }
}

// 创建dist压缩包
const createZip = async (envConfig) => {
    const { local } = envConfig

    if (!existsSync(local.distPathFull)) {
        logStep(exeStep, `本地${local.distName}文件夹不存在`, 'fail')
        process.exit(1)
    }

    const archive = archiver('zip', { zlib: 9 })
    const spinner = ora('文件正在压缩中')
    spinner.start()

    archive.on('error', (err) => {
        spinner.stop()
        logStep(exeStep, `本地${local.zipName}创建失败`, 'fail')
        throw err
    })
    archive.on('finish', (res) => {
        spinner.stop()
        logStep(exeStep, `本地${local.zipName}创建完成`)
    })

    archive.pipe(createWriteStream(local.zipName))
    archive.directory(local.distPathFull, '/')
    await archive.finalize()
}

// 上传本地压缩包
const connectSSh = async (envConfig) => {
    const {
        server: { host, port, username, password, privateKey, passphrase },
    } = envConfig

    // 建立SSH连接
    try {
        await ssh.connect({
            host,
            port,
            username,
            password,
            privateKey,
            passphrase,
        })
        if (ssh.isConnected()) {
            logStep(exeStep, `连接成功 SSH: ${host}:${port} `)
        } else {
            logStep(exeStep, `连接失败 SSH: ${host}:${port} `, 'fail')
        }
        return ssh.isConnected()
    } catch (err) {
        logStep(exeStep, `连接失败 SSH: ${host}:${port} `, 'fail')
        throw err
    }
}

const upload = async (envConfig) => {
    const { remote, local } = envConfig

    try {
        if (ssh.isConnected()) {
            const spinner = ora(`${local.zipName}上传中`)
            spinner.start()
            await ssh.putFile(local.zipPathFull, remote.zipPath)
            spinner.stop()
            logStep(exeStep, `本地${local.zipName}上传成功`)
        }
    } catch (err) {
        logStep(exeStep, `本地${local.zipName}上传失败`, 'fail')
        throw err
    }
}

// 远程解压压缩包
const unZip = async (envConfig) => {
    const { remote } = envConfig
    try {
        const spinner = ora(`远程${remote.zipName}解压中`)
        spinner.start()
        await ssh.execCommand(`cd ${remote.distPath}`, { cwd: remote.distPath })
        await ssh.execCommand(`rm -rf ${remote.distName}`, { cwd: remote.distPath })
        await ssh.execCommand(`mkdir ${remote.distName}`, { cwd: remote.distPath })
        await ssh.execCommand(`unzip -o ${remote.zipName} -d ${remote.distName}`, { cwd: remote.distPath })
        spinner.stop()
        logStep(exeStep, `远程${remote.zipName}解压成功`)
    } catch (err) {
        logStep(exeStep, `远程${remote.zipName}解压失败`)
        throw err
    }
}

// 远程删除压缩包
const removeRemoteZip = async (envConfig) => {
    const { remote } = envConfig
    try {
        await ssh.execCommand(`rm -f ${remote.zipName}`, { cwd: remote.distPath })
        logStep(exeStep, `远程${remote.zipName}删除成功`)
    } catch (err) {
        logStep(exeStep, `远程${remote.zipName}删除失败`)
        throw err
    }
}

// 部署任务
const deploy = async (config, env, option = {}) => {
    const currentConfig = await loadConfig(config, env)
    exeStep++

    if (option.check) {
        console.log(currentConfig)
        process.exit(0)
    }

    if (option.testSSh) {
        await connectSSh(currentConfig)
        process.exit(0)
    }

    if (!option.skip) {
        await execBuild(currentConfig)
    } else {
        logStep(exeStep, '已跳过项目打包', 'fail')
    }
    exeStep++

    await createZip(currentConfig)
    exeStep++

    const isConnect = await connectSSh(currentConfig)
    if (!isConnect) {
        return
    }
    exeStep++

    await upload(currentConfig)
    exeStep++

    await unZip(currentConfig)
    exeStep++

    if (!currentConfig.remote.isRetain) {
        await removeRemoteZip(currentConfig)
        exeStep++
    }

    if (!currentConfig.local.isRetain) {
        await removeLocalZip(currentConfig)
        exeStep++
    }

    if (option.del) {
        await removeLocalDist(currentConfig)
        exeStep++
    }

    logStep(exeStep, '项目部署已完成！  (*^_^*)')
    process.exit(0)
}

export { loadConfig, execBuild, createZip, connectSSh }

export default deploy
