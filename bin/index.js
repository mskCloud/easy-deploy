#! /usr/bin/env node

import { Command } from 'commander'
import { readFile } from 'fs/promises'
import path from 'path'
import init from '../lib/init.js'
import deploy from '../lib/deploy.js'
import { logStep, fetchFile, useCurrentPosition } from '../tools/index.js'

let version = '0.0.0'

const setVersion = async () => {
    const { dirname } = useCurrentPosition(import.meta.url)
    const res = await readFile(path.resolve(dirname, '../package.json'))
    const packageJson = JSON.parse(res)
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
        .option('-s --skip', '跳过将deploy添加至.gitignore')
        .action(function (option) {
            init(option)
        })

    program
        .command('run <env>')
        .description('根据选择的环境开始部署')
        .option('-s --skip', '跳过项目构建')
        .option('-d --del', '删除dist文件夹')
        .option('-c --check', '检查当前配置')
        .option('-ts --testSSh', '测试ssh连接')
        .action(async function (env, option) {
            try {
                const config = await fetchFile('/deploy/deploy.config.js')
                deploy(config.default, env, option)
            } catch (error) {
                logStep(0, '配置文件读取失败，请检查deploy.config.js是否存在？', 'fail')
                throw error
            }
        })

    program.parse()
}

async function createCli() {
    try {
        await setVersion()
        createProgram()
    } catch (error) {
        throw error
    }
}

createCli()
