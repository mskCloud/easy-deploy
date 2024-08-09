#! /usr/bin/env node

const path = require("path")
const { Command } = require("commander")

const packageJson = require("../package.json")
const init = require("../lib/init.js")
const deploy = require("../lib/deploy.js")
const { failLog, successLog } = require("../tools/index.js")

const program = new Command()
const version = packageJson.version

program.name("Easy Deploy Cli")
program.description("Finally, you can get lazy about deploying projects")
program.version(version, "-v, --version")

program
  .command("init")
  .description("初始化部署相关配置")
  .action(function () {
    init()
  })

program
  .command("run <env>")
  .description("根据选择的环境开始部署")
  .option("-np --nopack", "跳过打包")
  .option("-d --del", "删除dist文件夹")
  .action(async function (env, option) {
    try {
      let config = require(path.join(path.resolve(), "/deploy/deploy.config.cjs"))
      if (!config) {
        config = require(path.join(path.resolve(), "/deploy/deploy.config.js"))
      }
      successLog("(1) 配置文件加载成功")
      deploy(config, env, option)
    } catch (error) {
      failLog("(1) 配置文件加载失败", error)
      throw error
    }
  })

program.parse()
