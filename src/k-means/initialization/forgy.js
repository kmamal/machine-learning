const { chooseN } = require('@kmamal/util/random/choose-n')

const initialize = (points, K) => chooseN(points, K)

module.exports = { initialize }
