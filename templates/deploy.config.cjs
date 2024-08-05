const config = {
  // 压缩类型，目前仅支持 zip
  compressType: "zip",
  // 服务器部署环境
  env: [
    {
      // 环境名，也是部署命令，如：deploy start dev，仅限英文
      name: "dev",
      // 打包命令，可以是 npm run build，yarn build 等
      script: "npm run build",
      // 服务器相关
      server: {
        host: "",
        port: 22,
        username: "",
        password: "",
        // 私钥路径，如果有
        privateKey: "",
        // 私钥 passphrase，如果有
        passphrase: "",
      },
      // 本地文件
      local: {
        // 本地 dist 目录
        distPath: "../dist",
        // 压缩包名称
        zipName: "dist",
        // 压缩包存放的位置，若保留
        zipPath: "../",
        // 是否保留压缩包，若保留，则附加日期后缀，如：dist-[YYYY-MM-DD-hh-mm-ss]
        isRetain: false,
      },
      // 服务器远程部署目录
      remote: {
        // 部署项目的位置
        distPath: "/home",
        // 部署 dist 名称，也是压缩包解压后的文件名
        distName: "dist",
        // 压缩包名称
        zipName: "dist",
        // 压缩包存放的位置，若保留
        zipPath: "/home",
        // 是否保留压缩包，若保留，则附加日期后缀，如：dist-[YYYY-MM-DD-hh-mm-ss]
        isRetain: false,
      },
    },
  ],
}

module.exports = config
