const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/sequelize')

const Product = sequelize.define('products', {
  product_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  product_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  brand_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  warranty_month: {
    type: DataTypes.INTEGER,
    defaultValue: 12
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  is_show: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
})

module.exports = Product
