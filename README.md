# LapZone E-Commerce - Backend API

Backend API for LapZone e-commerce platform, built with Node.js, Express, and MySQL.

## 📋 Table of Contents

- [System Requirements](#system-requirements)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Scripts](#scripts)

## 🔧 System Requirements

- Node.js >= 22.0.0
- MySQL >= 8.0
- npm or yarn

## 🛠 Tech Stack

- **Framework:** Express.js
- **Database:** MySQL (Sequelize ORM)
- **Authentication:** JWT (JSON Web Tokens)
- **Image Upload:** Cloudinary
- **Payment Gateway:** MoMo
- **Search:** Elasticsearch
- **AI:** Google Generative AI
- **Email:** Resend
- **Real-time:** Socket.IO

### Main Dependencies

```json
{
  "express": "^4.21.1",
  "sequelize": "^6.37.7",
  "mysql2": "^3.16.0",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^3.0.2",
  "cloudinary": "^2.7.0",
  "@elastic/elasticsearch": "^9.2.0",
  "socket.io": "^4.8.1",
  "cors": "^2.8.5"
}
```

## 📦 Installation

1. **Clone repository**
```bash
git clone <repository-url>
cd pttkht-lapzone-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create .env file**
```bash
cp .env.example .env
```

4. **Update .env file with your configuration** (see [Configuration](#configuration) section)

5. **Create MySQL database**
```bash
mysql -u root -p
CREATE DATABASE lapzone;
```

6. **Setup Elasticsearch indexes (optional)**
```bash
npm run setup-indexes
```

## ⚙️ Configuration

Edit the `.env` file with the following information:

### Database Configuration
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=lapzone
MYSQL_USER=root
MYSQL_PASSWORD=your_password_here
```

### Server Configuration
```env
LOCAL_DEV_APP_HOST=localhost
LOCAL_DEV_APP_PORT=8020
WEBSITE_DOMAIN_DEVELOPMENT=http://localhost:3000
```

### JWT Configuration
```env
ACCESS_TOKEN_SECRET_SIGNATURE=your-access-token-secret-here
ACCESS_TOKEN_LIFE=1h
REFRESH_TOKEN_SECRET_SIGNATURE=your-refresh-token-secret-here
REFRESH_TOKEN_LIFE=14d
```

### Cloudinary Configuration
```env
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### MoMo Payment Gateway
```env
MOMO_ACCESS_KEY=your-momo-access-key
MOMO_SECRET_KEY=your-momo-secret-key
MOMO_PARTNER_CODE=your-partner-code
MOMO_PARTNER_NAME=LapZone
MOMO_STORE_ID=LapZoneStore
MOMO_API_HOST=test-payment.momo.vn
```

## 🚀 Running the Application

### Development mode
```bash
npm start
```
Server will run at `http://localhost:8020`

### Production mode
```bash
npm run production
```

### Build project
```bash
npm run build
```

### Lint code
```bash
npm run lint
```

## 📡 API Endpoints

Base URL: `http://localhost:8020/api/v1`

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/signup` | Register new account | ❌ |
| POST | `/auth/signin` | User login | ❌ |
| POST | `/auth/signout` | User logout | ✅ |
| POST | `/auth/refresh` | Refresh access token | ✅ |

### Products (Public)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/products` | Get all products | ❌ |
| GET | `/products/search` | Search products | ❌ |
| GET | `/products/:id` | Get product details | ❌ |

### Cart

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/cart` | Get user cart | ✅ |
| POST | `/cart/items` | Add product to cart | ✅ |
| PUT | `/cart/items/:product_id` | Update item quantity | ✅ |
| DELETE | `/cart/items/:product_id` | Remove item from cart | ✅ |

### Orders

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/orders/checkout` | Create payment | ✅ |
| POST | `/orders` | Create order | ✅ |
| GET | `/orders` | Get user orders | ✅ |
| GET | `/orders/:order_id` | Get order details | ✅ |
| PUT | `/orders/:order_id/cancel` | Cancel order | ✅ |

### Payment

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payment/momo/callback` | MoMo payment callback | ❌ |

### Manage Products (Admin)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/manage/products` | Get all products | ✅ | Admin |
| GET | `/manage/products/search` | Search products | ✅ | Admin |
| GET | `/manage/products/:product_id` | Get product details | ✅ | Admin |
| POST | `/manage/products` | Create new product | ✅ | Admin |
| PUT | `/manage/products/:product_id` | Update product | ✅ | Admin |
| DELETE | `/manage/products/:product_id` | Delete product | ✅ | Admin |

### Manage Orders (Admin)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/manage/orders` | Get all orders | ✅ | Admin |
| GET | `/manage/orders/:order_id` | Get order details | ✅ | Admin |
| PUT | `/manage/orders/:order_id/status` | Update order status | ✅ | Admin |

### Analytics (Admin)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/analytics/*` | Analytics endpoints | ✅ | Admin |

## 📁 Project Structure

```
pttkht-lapzone-backend/
├── src/
│   ├── config/              # Application configuration
│   │   ├── cors.js          # CORS configuration
│   │   ├── environment.js   # Environment variables
│   │   └── sequelize.js     # Database configuration
│   │
│   ├── controllers/         # Request handlers
│   │   ├── analyticController.js
│   │   ├── authController.js
│   │   ├── cartController.js
│   │   ├── orderController.js
│   │   ├── productController.js
│   │   ├── paymentController.js
│   │   ├── manageOrderController.js
│   │   ├── manageProductController.js
│   │   ├── signinController.js
│   │   └── signupController.js
│   │
│   ├── middlewares/         # Middleware functions
│   │   ├── authMiddleware.js           # JWT authentication
│   │   ├── rbacMiddleware.js           # Role-based access control
│   │   ├── errorHandlingMiddleware.js  # Error handling
│   │   └── multerUploadMiddleware.js   # File upload
│   │
│   ├── models/              # Database models (Sequelize)
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Cart.js
│   │   ├── CartItem.js
│   │   ├── Order.js
│   │   ├── OrderItem.js
│   │   ├── Payment.js
│   │   └── Voucher.js
│   │
│   ├── providers/           # External service providers
│   │   ├── CloudinaryProvider.js  # Image upload
│   │   └── JwtProvider.js         # JWT operations
│   │
│   ├── routes/              # Route definitions
│   │   └── v1/
│   │       ├── index.js
│   │       ├── authRoute.js
│   │       ├── productRoute.js
│   │       ├── cartRoute.js
│   │       ├── orderRoute.js
│   │       ├── paymentRoute.js
│   │       ├── analyticRoute.js
│   │       ├── manageProductRoute.js
│   │       └── manageOrderRoute.js
│   │
│   ├── services/            # Business logic
│   │   ├── userService.js
│   │   ├── productService.js
│   │   ├── cartService.js
│   │   ├── orderService.js
│   │   ├── paymentService.js
│   │   └── voucherService.js
│   │
│   ├── utils/               # Utility functions
│   │   └── ApiError.js
│   │
│   ├── scripts/             # Utility scripts
│   │
│   └── server.js            # Entry point
│
├── .env                     # Environment variables (git ignored)
├── .env.example             # Environment template
├── .babelrc                 # Babel configuration
├── .eslintrc.cjs            # ESLint configuration
├── jsconfig.json            # JavaScript configuration
├── package.json             # Dependencies & scripts
└── README.md                # Documentation
```

## 📜 Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Start | `npm start` | Run development server with nodemon |
| Build | `npm run build` | Build project for production |
| Production | `npm run production` | Run production server |
| Lint | `npm run lint` | Check code style with ESLint |
| Setup Indexes | `npm run setup-indexes` | Setup Elasticsearch indexes |

## 🔒 Authentication & Authorization

### JWT Tokens

- **Access Token:** Used for API requests (lifetime: 1 hour)
- **Refresh Token:** Used to get new access tokens (lifetime: 14 days)

### Roles

- **User:** Regular customer
- **Admin:** System administrator

### Protected Routes

Routes requiring authentication need the following header:
```
Authorization: Bearer <access_token>
```

## 🗄️ Database Schema

### Main Tables:

- **Users:** User information
- **Products:** Product information
- **Carts:** Shopping carts
- **CartItems:** Cart item details
- **Orders:** Orders
- **OrderItems:** Order item details
- **Payments:** Payment transactions
- **Vouchers:** Discount codes


## 📝 License

This project is developed for educational purposes.

## 📧 Contact

For questions, please contact through repository issues.

---

**Note:** This is a demo project for Information System Analysis and Design course. Not for commercial use.
