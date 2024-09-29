# 一个容易的项目部署小工具【2.0.0】。

2.x 版本有更好的错误处理，更多的命令，更好的提示

## 安装

```bash
# 这是一个脚手架，所以请安装到全局
npm i -g easy-deploy-cli
```

## 使用

```bash
# 在项目文件夹下初始化得到部署模版/deploy/deploy.config.cjs，重复使用init会重置原来的模版。
# 2.x版本会自动将deploy添加之.gitignore
deploy init

# dev 为config中的name值，常见命令值有dev、prod、test等等
deploy run dev

# 跳过项目构建命令，直接使用存在的dist目录压缩上传
deploy run dev -s

# 上传完后立即删除本地dist文件夹
deploy run dev -d

# 用于检查当前config，如zip路径
deploy run dev -c

# 用于测试ssh连接
deploy run dev -ts
```

## deploy.onfig 注意事项以及说明[]

1. 在环境配置中， `name`是做为运行命令，请小心填写~
2. 压缩类型现在只支持 zip。
3. 模版文件中注释请仔细查看
4. 若无特别要求，**例如：服务器部署文件为 `dist`时，配置中的 `local`可不做修改，仅需修改 `remote`中的 `distPath`和 `zipPath`即可**
5. 配置文件中的 `local`和 `remote`，可以自定义打包文件夹名，压缩包名，如果你需要的话，还可通过 `isRetain`来保留压缩包，压缩包会自带日期，如 `dist-[YYYY-MM-DD-hh-mm-ss].zip`
6. **~~请把 `deploy`添加到 `.gitgnore`中~~，现在会在 init 时自动添加**

## 更新日志

1. 好了，终于可以从原始人到了石器时代了（原始人：手动打包=>ssh 连接=>ftp 上传=>命令解压=>删除，如果要保留 zip，还得手动重命名文件，麻了）
2. 这个小工具，也就适合这种不怎么严谨，前端居然都能拿到服务器的账号的团队吧~
3. 不过对于个人项目的个人服务器来说，到也合适，就不用去搞 `jenkins`什么的了。
4. 【2024-9-29】其实也没更新啥，只优化了下代码，加了点小功能
