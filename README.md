# 一个容易的项目部署小工具。

## 安装

```bash
# 这是脚手架，所以请安装到全局
npm i -g easy-deploy-cli
```

## 使用

```bash
# 在项目文件夹下初始化得到部署模版/deploy/deploy.config.cjs，重复使用init会重置原来的模版。
# 请把deploy添加到.gitgnore中
deploy init

# dev 为env数组中的name值，常见命令值有prod、test等等
deploy run dev

# 如果需要跳过项目打包命令，如npm run build，可使用-np选型，
deploy run dev -np

# -d可以删除本地dist文件夹，保证打包文件都是最新的。
# 【注意】不要和-np一起使用，因为删除dist后，再跳过打包就没有dist了
deploy run dev -d
```

## deploy.onfig 注意事项以及说明

1. 在 env 数组中可以新增不同环境配置，其中 `name`是做为运行命令，请小心填写~
2. 压缩类型现在只支持 zip，别瞎填
3. 模版文件中注释请仔细查看
4. 若无特别要求，**如打包文件夹为 `dist`，`config`中的 `local`可不做修改，仅需修改 `remote`中的 `distPath`和 `zipPath`即可**
5. 配置文件中的 `local`和 `remote`，可以自定义打包文件夹名，压缩包名，如果你需要的话，还可通过 `isRetain`来保留压缩包，压缩包会自带日期，如 `dist-[YYYY-MM-DD-hh-mm-ss]`，可能用到就是 `remote`
6. **请把 `deploy`添加到 `.gitgnore`中**

```js
const config = {
  // 压缩类型，目前仅支持 zip
  compressType: "zip",
  // 服务器部署环境
  env: [
    { name: "dev", /* ....省略 */, local: { /* .... */ }, remote: { /* .... */ }}},
  ],
}

module.exports = config

```

## 碎碎念

1. 好了，终于可以从原始人到了石器时代了（原始人：手动打包=>ssh 连接=>ftp 上传=>命令解压=>删除，如果要保留 zip，还得手动重命名文件，麻了）
2. 这个小工具，也就适合这种不怎么严谨，前端居然都能拿到服务器的账号的团队吧~
3. 不过对于个人项目的个人服务器来说，到也合适，就不用去搞 `jenkins`什么的了。
