# LapZone E-Commerce Backend

A comprehensive Node.js backend API for an e-commerce platform specializing in laptops and computer accessories. Built with Express.js, MongoDB, and modern web technologies, featuring real-time chat, payment integration, and automated order management.

## 🚀 Tech Stack

- **Runtime:** Node.js >= 22.0.0
- **Framework:** Express.js
- **Database:** MongoDB Atlas
- **Real-time:** Socket.IO
- **Authentication:** JWT + Google OAuth2
- **Payment Gateway:** MoMo Payment
- **AI Integration:** Google Gemini AI (Chatbot)
- **Image Storage:** Cloudinary
- **Email Service:** Resend
- **API Documentation:** Swagger UI
- **Process Manager:** PM2
- **Task Scheduler:** Cron Jobs

## ✨ Key Features

### Core Features
- **Authentication & Authorization**
  - JWT-based authentication (access/refresh tokens)
  - Google OAuth2 login integration
  - Role-based access control (RBAC) - Admin, Manager, Customer
  - HTTP-only cookie security

- **Product Management**
  - Multi-category support (laptops, peripherals, accessories)
  - Advanced filtering (brand, price, specs, condition)
  - Stock management & inventory tracking
  - Product reviews & ratings
  - Image upload to Cloudinary

- **Shopping Experience**
  - Shopping cart with real-time updates
  - Wishlist functionality
  - Order placement & tracking
  - Multiple payment methods (MoMo, COD)
  - Vietnam location service (provinces, districts, wards)

- **AI-Powered Chat**
  - Real-time chat with Gemini AI chatbot
  - Socket.IO for instant messaging
  - Conversation history tracking
  - Typing indicators & read receipts

### Automation
- **Cron Jobs**
  - Auto-cancel unpaid MoMo orders after 1 hour 40 minutes (runs every hour)
  - Automatic stock restoration on cancellation
  - COD orders are exempt from auto-cancellation

### Admin Features
- User management
- Product CRUD operations
- Order management & monitoring
- Homepage content configuration

## 📦 Installation & Setup

### Prerequisites
```bash
node >= 22.0.0
npm or yarn
MongoDB Atlas account
```

### Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd backend-web-project-ecommerce
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env` file in the root directory (see [Environment Variables](#environment-variables))

4. **Build the project**
```bash
npm run build
```

5. **Run the application**

**Development mode:**
```bash
npm start
```

**Production mode:**
```bash
npm run production
```

**Using PM2:**
```bash
pm2 start ecosystem.config.js --env production
```

6. **Access API Documentation**
Navigate to `http://localhost:8020/api-docs` for Swagger UI

## 📁 Project Structure

```
src/
├── config/           # Configuration files (MongoDB, CORS, Swagger, Logger)
├── controllers/      # Request handlers
├── middlewares/      # Auth, RBAC, error handling, logging
├── models/           # MongoDB schemas & data access layer
├── providers/        # External services (Cloudinary, Gemini AI, MoMo, JWT, Resend)
├── routes/          # API route definitions
│   └── v1/          # API version 1
├── services/        # Business logic layer
├── sockets/         # Socket.IO real-time features
├── jobs/            # Cron job definitions
├── validations/     # Request validation schemas (Joi)
├── utils/           # Utilities & helpers
└── server.js        # Application entry point
```

## 🔌 API Overview

### Base URL
- **Development:** `http://localhost:8020/v1`
- **Production:** `<your-domain>/v1`

### Main Endpoints

| Module | Endpoint | Description |
|--------|----------|-------------|
| Auth | `/auth` | Login, register, Google OAuth, token refresh |
| Users | `/users` | User profile, password management |
| Products | `/products` | Product catalog, search, filtering |
| Cart | `/cart` | Shopping cart operations |
| Orders | `/orders` | Order placement, tracking, history |
| Reviews | `/reviews` | Product reviews & ratings |
| Wishlist | `/wishlist` | Save favorite products |
| Chat | `/chats` | AI chatbot conversations |
| Locations | `/locations` | Vietnam location data |
| Homepage | `/homepage` | Homepage content & banners |

### Workflow Example

**User Purchase Flow:**
1. Register/Login → `/auth/register` or `/auth/login`
2. Browse Products → `/products?category=laptop`
3. Add to Cart → `POST /cart`
4. Create Order → `POST /orders`
5. Process Payment → MoMo redirect
6. Payment Callback → `/orders/momo-ipn`
7. Track Order → `GET /orders/:orderId`

## 🚢 Deployment Notes

### PM2 Production Deployment

1. **Build the application**
```bash
npm run build
```

2. **Start with PM2**
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

3. **Monitor application**
```bash
pm2 monit
pm2 logs lapzone
```

### Environment Considerations

- Set `BUILD_MODE=production` in production
- Use strong JWT secret keys
- Configure MongoDB IP whitelist
- Set up SSL/TLS for HTTPS
- Enable rate limiting for API endpoints
- Configure CORS whitelist properly
- Use environment-specific URLs for payment callbacks

### Logging

- Application logs: `./logs/application-*.log`
- PM2 logs: `./logs/pm2-error.log`, `./logs/pm2-out.log`
- Log rotation: 7 days retention, 10MB max size

## 📄 Scripts

```bash
npm start              # Run in development mode with hot-reload
npm run build          # Build project with Babel
npm run production     # Build and run in production mode
npm run lint           # Run ESLint code quality check
```

## 🔒 Security Features

- JWT with refresh token rotation
- HTTP-only cookies for tokens
- HMAC-SHA256 signatures for payment requests
- Role-based access control (RBAC)
- Input validation with Joi
- MongoDB injection prevention
- CORS whitelist configuration
- Request logging & monitoring

## 📝 License

This project is private and proprietary.

---

**Developed for LapZone E-Commerce Platform**
