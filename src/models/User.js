const { DataTypes } = require('sequelize')
const { sequelize } = require('../config/sequelize')

const User = sequelize.define('users', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  full_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  role: {
    type: DataTypes.ENUM('CUSTOMER', 'ADMIN'),
    defaultValue: 'CUSTOMER'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
})

module.exports = User
