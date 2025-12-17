const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/sequelize')

const Cart = sequelize.define('carts', {
  cart_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
})

module.exports = Cart
