const fs = require('fs')
const path = require('path')
const { readTextFile, deleteFile, hash: { getStrMd5 } } = global.tool
const { SESSION_TYPE = 'file', APP_DIR } = require(':config')
const { TMP_DIR } = APP_DIR

/*
  session type 支持 memory 内存存储和 file 文件存储
  除非是在开发阶段 否则推荐 memory 存储
  因为 file 存储的 session 文件不会自动删除，会越来越多
  有更高的要求，可参考 memory 写法，增加 redis 数据库
*/

// 存储token
const setToken = async ({ role, account, token, time, id }) => {
  const types = {
    async memory() {
      if (!global.session) global.session = {}
      global.session[token] = {
        role,
        account,
        time,
        id
      }
    },
    async file() {
      const filename = `session_||${token}`
      const filePath = path.resolve(TMP_DIR, filename)
      const fileContent = `${role}||${account}||${id}||${token}||${time}`
      await fs.writeFile(filePath, fileContent, err => {
        if (err) return new Error('session 文件写入失败')
      })
    }
  }
  await types[SESSION_TYPE]()
}

// 读取 token并返回结果
const getToken = async token => {
  const types = {
    async memory() {
      if (!global.session) global.session = {}
      return global.session[token] || {}
    },
    async file() {
      const filename = `session_||${token}`
      const filePath = path.resolve(TMP_DIR, filename)
      const data = await readTextFile(filePath).catch(() => false)
      if (data) {
        const [role, account, id, token, time] = data.split('||')
        return { role, account, id, token, time }
      } else {
        return {}
      }
    }
  }
  const res = await types[SESSION_TYPE]()
  return res
}

// 删除 token
const removeToken = async token => {
  const types = {
    async memory() {
      if (!global.session) global.session = {}
      delete global.session[token]
    },
    async file() {
      const filename = `session_||${token}`
      const filePath = path.resolve(TMP_DIR, filename)
      const res = await deleteFile(filePath).catch(() => false)
      console.log('删除文件', res)
    }
  }
  await types[SESSION_TYPE]()
}

const makeToken = async (role, account, id) => {
  const time = +new Date()
  const token = getStrMd5(role + account + time)
  // crypto.createHash('md5').update(role + account + time).digest('hex')
  // 将 ID 转成字符串，方便后续内部查询
  id = id.toString()
  await setToken({ role, account, token, time, id })
  return token
}

const checkToken = async token => {
  let res = false
  if (token) {
    const tokenSave = await getToken(token)
    if (tokenSave) {
      const { role, account, time } = tokenSave
      const diff = +new Date() - time
      if (diff <= 86400000) {
        res = { role, account }
        // 如果还有一个小时就过期，那么就去更新一下token，延长有效期
        if (diff >= 82800000) updateToken(token)
      }
    }
  }
  return res
}

// 更新 token 时间
const updateToken = async token => {
  const rightToken = await checkToken(token)
  if (rightToken) {
    const { role, account, id } = rightToken
    const time = +new Date()
    await setToken({ role, account, token, time, id })
    return true
  }
  return false
}
module.exports = { getToken, setToken, makeToken, checkToken, updateToken, removeToken }
