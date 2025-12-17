const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/sequelize')

const OrderItem = sequelize.define('order_items', {
  order_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  product_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
})

module.exports = OrderItem
