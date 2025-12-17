/**
 * AUTH ROUTES - Sign Up & Sign In
 */

import express from 'express'
import { signupController } from '../../controllers/signupController'
import { signinController } from '../../controllers/signinController'

const Router = express.Router()

/**
 * SIGN UP ROUTES
 */

// POST /api/v1/auth/signup - Register new user
Router.post('/signup', signupController.storeData)

/**
 * SIGN IN ROUTES
 */

// POST /api/v1/auth/signin - Login
Router.post('/signin', signinController.validateCredentials)

// POST /api/v1/auth/signout - Logout
Router.post('/signout', signinController.signOut)

export const authRoute = Router
