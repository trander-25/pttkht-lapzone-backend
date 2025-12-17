const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/sequelize')

const WishlistItem = sequelize.define('wishlist_items', {
  wishlist_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  }
})

module.exports = WishlistItem
