import { DataTypes } from 'sequelize'
import { sequelize } from '../config/sequelize.js'

const ProductDetail = sequelize.define('product_details', {
  product_id: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  cpu: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  ram: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  storage: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  gpu: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  screen: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  weight: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  battery: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
})

export default ProductDetail
