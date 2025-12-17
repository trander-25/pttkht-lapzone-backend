const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/sequelize')

const CartItem = sequelize.define('cart_items', {
  cart_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  }
})

module.exports = CartItem
