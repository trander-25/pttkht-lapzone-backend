const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/sequelize')

const Wishlist = sequelize.define('wishlists', {
  wishlist_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
})

module.exports = Wishlist
