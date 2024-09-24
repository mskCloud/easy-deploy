#! /usr/bin/env node

import path from 'path'
import url from 'node:url'
import { Command } from 'commander'

import init from '../lib/init.js'
import deploy from '../lib/deploy.js'
import { successLog, failLog, fetchFile } from '../tools/index.js'

let version = '2.0.0'

const setVersion = async () => {
    const packageJson = await fetchFile('/package.json', 'json')
    version = packageJson.version
    return version
}

const createProgram = () => {
    const program = new Command()

    program.name('Easy Deploy Cli')
    program.description('Finally, you can get lazy about deploying projects')
    program.version(version, '-v, --version')

    program
        .command('init')
        .description('初始化部署相关配置')
        .action(function () {
            init()
        })

    program
        .command('test')
        .description('初始化部署相关配置')
        .action(function () {})

    program
        .command('run <env>')
        .description('根据选择的环境开始部署')
        .option('-np --nopack', '跳过打包')
        .option('-d --del', '删除dist文件夹')
        .action(async function (env, option) {
            try {
                const config = await fetchFile('/deploy/deploy.config.js')
                successLog('(1) 配置文件加载成功')
                console.log(config.default)
                deploy(config.default, env, option)
            } catch (error) {
                failLog('(1) 配置文件加载失败', error)
                throw error
            }
        })

    program.parse()
}

async function createCli() {
    await setVersion()
    createProgram()
}

createCli()
