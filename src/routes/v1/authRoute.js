/**
 * AUTH ROUTES - Sign Up & Sign In
 */

import express from 'express'
import { signupController } from '../../controllers/signupController'
import { signinController } from '../../controllers/signinController'
import { authController } from '../../controllers/authController'

const Router = express.Router()

/**
 * SIGN UP ROUTES
 */

// POST /api/v1/auth/signup - Register new user
Router.post('/signup', signupController.signup)

/**
 * SIGN IN ROUTES
 */

// POST /api/v1/auth/signin - Login
Router.post('/signin', signinController.signin)

// POST /api/v1/auth/refresh-token - Refresh access token
Router.post('/refresh-token', authController.refreshToken)

// POST /api/v1/auth/signout - Logout
Router.post('/signout', authController.signout)

export const authRoute = Router
