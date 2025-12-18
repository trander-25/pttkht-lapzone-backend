import { DataTypes } from 'sequelize'
import { sequelize } from '../config/sequelize.js'

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
  brand: {
    type: DataTypes.ENUM('LENOVO', 'ASUS', 'ACER', 'DELL', 'HP'),
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

export default Product
