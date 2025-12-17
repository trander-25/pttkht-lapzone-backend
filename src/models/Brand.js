const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/sequelize')

const Brand = sequelize.define('brands', {
  brand_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  brand_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  }
})

module.exports = Brand
