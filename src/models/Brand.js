import { DataTypes } from 'sequelize'
import { sequelize } from '../config/sequelize.js'

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

export default Brand
