module.exports = {
  ls(data, role, ctx) {
    data.list.map(r => {
      delete r.password
    })
    return data
  },
  get(data, ctx, allParams) {
    delete data.password
    return data
  }
}
