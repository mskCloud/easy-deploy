const path = require("path")
const fs = require("fs")
const { execSync } = require("child_process")
const { NodeSSH } = require("node-ssh")
const archiver = require("archiver")
const ora = require("ora")
const { getCurrentDate, successLog, failLog } = require("../tools/index.js")

const currentConfig = {
  compressType: "zip",
  current: null,
}
const ssh = new NodeSSH()

function patchNameAndPath(fileInfo, type) {
  if (!fileInfo) {
    return
  }
  let { distName = "", distPath = "", isRetain = false, zipName = "", zipPath = "" } = fileInfo
  const zipType = currentConfig.compressType
  let distPathFull = ""
  let zipPathFull = ""

  if (!distPath) {
    failLog("deploy.config: 缺少文件夹路径")
    process.exit(1)
  }

  // 获取文件夹名，如果没有配置，则从路径中寻找
  if (!distName) {
    let i = distPath.lastIndexOf("/")
    if (!i) {
      i = 0
    }
    distName = distPath.slice(i + 1)
    if (!distName) {
      failLog("deploy.config: 找不到文件夹")
      process.exit(1)
    }
  }

  if (isRetain) {
    zipName = zipName + `-[${getCurrentDate()}].${zipType}`
  } else {
    zipName = zipName + `.${zipType}`
  }

  if (!zipPath.endsWith("/")) {
    zipPath += "/"
  }
  zipPath = zipPath + zipName

  if (type === "local") {
    try {
      distPathFull = path.resolve(path.join(process.cwd(), "/deploy"), distPath)
      zipPathFull = path.resolve(path.join(process.cwd(), "/deploy"), zipPath)
    } catch (err) {
      failLog("本地zip查找失败")
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

async function loadConfig(config, env) {
  if (!Array.isArray(config.env)) {
    failLog("deploy.config: 请配置env")
    process.exit(1)
  }

  currentConfig.compressType = config.compressType

  config.env.forEach((item) => {
    if (item.name === env) {
      currentConfig.current = item
    }
  })

  if (!currentConfig.current) {
    failLog(`${env}:命令读取失败，请确认${env}是否与环境中name一致`)
    process.exit(1)
  }

  try {
    const { current } = currentConfig
    current.local = patchNameAndPath(current.local, "local")
    current.remote = patchNameAndPath(current.remote)
  } catch (err) {
    throw err
  }

  return currentConfig
}

// 使用script进行项目打包
async function execBuild(envConfig) {
  const { script } = envConfig
  try {
    const spinner = ora(`${script} 执行中`)
    spinner.start()
    execSync(script)
    spinner.stop()
    successLog("(2) 项目打包成功")
  } catch (error) {
    failLog("(2) 项目打包失败")
    spinner.stop()
    throw error
  }
}

// 删除本地dist目录
async function removeLocalDist(envConfig) {
  const { local } = envConfig
  const isExist = fs.existsSync(local.distPathFull)
  if (!isExist) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    fs.rm(local.distPathFull, { recursive: true }, (err) => {
      if (err) {
        reject(false)
        failLog("本地dist文件夹删除失败")
        throw err
      }
      resolve(true)
    })
  })
}

// 删除本地压缩包
async function removeLocalZip(envConfig) {
  const { local } = envConfig

  const isExist = fs.existsSync(local.zipPathFull)
  if (!isExist) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    fs.rm(local.zipPathFull, (err) => {
      if (err) {
        reject(false)
        failLog("本地zip包删除失败")
        throw err
      }
      resolve(true)
    })
  })
}

// 创建dist压缩包
async function createZip(envConfig, compressType) {
  const { local } = envConfig

  if (!fs.existsSync(local.distPathFull)) {
    failLog("(3) 本地dist文件夹不存在")
    process.exit(1)
  }

  const archive = archiver(compressType, { zlib: 9 })

  const spinner = ora("文件正在压缩中")
  spinner.start()

  archive.on("error", (err) => {
    spinner.stop()
    failLog("(3) 本地zip创建失败")
    throw err
  })
  archive.on("finish", (res) => {
    spinner.stop()
    successLog("(3) 本地zip创建完成", local.zipPathFull)
  })

  archive.pipe(fs.createWriteStream(local.zipName))
  archive.directory(local.distPathFull, "/")
  await archive.finalize()
}

// 上传本地压缩包
async function upload(envConfig) {
  const {
    server: { host, port, username, password, privateKey, passphrase },
    remote,
    local,
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
    successLog(`(4) SSH: ${host}:${port} 连接成功`)
  } catch (err) {
    failLog("(4) 服务器: SSH 连接出错")
    throw err
  }

  try {
    const spinner = ora("zip上传中")
    spinner.start()
    await ssh.putFile(local.zipPathFull, remote.zipPath)
    spinner.stop()
    successLog("(5) zip上传成功", remote.zipPath)
  } catch (err) {
    failLog("(5) zip上传失败", err)
    throw err
  }
}

// 远程解压压缩包
async function unZip(envConfig) {
  const { remote } = envConfig
  try {
    const spinner = ora("zip解压中")
    spinner.start()
    await ssh.execCommand(`cd ${remote.distPath}`, { cwd: remote.distPath })
    await ssh.execCommand(`rm -rf ${remote.distName}`, { cwd: remote.distPath })
    await ssh.execCommand(`mkdir ${remote.distName}`, { cwd: remote.distPath })
    await ssh.execCommand(`unzip -o ${remote.zipName} -d ${remote.distName}`, { cwd: remote.distPath })
    spinner.stop()
    successLog("(5) zip解压成功")
    if (!remote.isRetain) {
      await ssh.execCommand(`rm -f ${remote.zipName}`, { cwd: remote.distPath })
      successLog("(6) 远程zip已删除")
      return
    }
  } catch (err) {
    failLog("(5) zip解压失败")
    throw err
  }
}

// 部署任务
async function deploy(config, env, option = {}) {
  await loadConfig(config, env)
  const { current } = currentConfig
  if (!current) {
    failLog("当前配置为空，请填写配置文件！")
    process.exit(1)
  }

  if (option.del) {
    await removeLocalDist(current)
    successLog("(A)", "本地dist文件夹删除成功")
  }
  if (option.nopack) {
    failLog("(2) 已跳过项目打包")
  } else {
    await execBuild(current)
  }

  await removeLocalZip(current)
  await createZip(current, currentConfig.compressType)
  await upload(current)
  await unZip(current)

  if (!current.local.isRetain) {
    const res = await removeLocalZip(current)
    if (res) {
      successLog("(7) 本地zip已删除")
    }
  }
  if (option.del) {
    await removeLocalDist(current)
    successLog("(B)", "本地dist文件夹删除成功")
  }

  successLog("(8) 项目部署已完成！", "(*^_^*)")
  process.exit(0)
}

module.exports = deploy
