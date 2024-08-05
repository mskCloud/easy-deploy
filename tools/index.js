// import chalk from "chalk"
const chalk = require("chalk")
// 获取当前日期并格式化为 YYYY-MM-DD-HH-MM-SS 格式
const getCurrentDate = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = `0${date.getMonth() + 1}`.slice(-2)
  const day = `0${date.getDate()}`.slice(-2)
  const hour = date.getHours()
  const minute = `0${date.getMinutes()}`.slice(-2)
  const second = `0${date.getSeconds()}`.slice(-2)

  return `${year}-${month}-${day}-${hour}-${minute}-${second}`
}

const successLog = (info, ...arg) => console.log(chalk.green(info, ...arg))
const failLog = (info, ...arg) => console.log(chalk.red(info, ...arg))

module.exports = {
  getCurrentDate,
  successLog,
  failLog,
}
