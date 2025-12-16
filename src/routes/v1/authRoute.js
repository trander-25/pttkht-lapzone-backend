import express from 'express'
import { authValidation } from '~/validations/authValidation'
import { authController } from '~/controllers/authController'
import { authMiddleware } from '~/middlewares/authMiddleware'
const Router = express.Router()

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user account
 *     description: |
 *       Create a new user account with email and password.
 *       - Account created with isActive=false (requires email verification)
 *       - Verification email sent automatically with UUID token (no expiration)
 *       - Username defaults to email prefix if not provided
 *       - Password must be at least 8 chars with uppercase, lowercase, and number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - username
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@gmail.com
 *                 description: User's email address (must be unique)
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: Vuthevinh25
 *                 description: Password (min 8 chars, must contain uppercase, lowercase, number)
 *               username:
 *                 type: string
 *                 example: johndoe
 *                 description: Display name for the user
 *     responses:
 *       201:
 *         description: Account created successfully (verification email sent, account inactive until verified)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *             example:
 *               _id: 507f1f77bcf86cd799439011
 *               email: test@gmail.com
 *               username: johndoe
 *               role: customer
 *               isActive: false
 *               provider: local
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               statusCode: 409
 *               message: Email already exists!
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.route('/register')
  .post(authValidation.createAccount, authController.createAccount)

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login with email and password
 *     description: |
 *       Authenticate user and receive JWT tokens in HTTP-only cookies.
 *       - Tokens auto-included in subsequent requests (withCredentials: true)
 *       - accessToken: 14 days (for development, should be shorter in production)
 *       - refreshToken: 14 days
 *       - Cookies: httpOnly=true, secure=true, sameSite=none
 *       - Account must be verified (isActive=true) to login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: test@gmail.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Vuthevinh25
 *     responses:
 *       200:
 *         description: Login successful - Tokens set in HTTP-only cookies
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: accessToken=eyJhbG...; HttpOnly; Secure; SameSite=None; Max-Age=1209600
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               statusCode: 404
 *               message: Account not found!
 *       406:
 *         description: Invalid credentials or inactive account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               inactive:
 *                 value:
 *                   statusCode: 406
 *                   message: Your account is not active!
 *               wrongPassword:
 *                 value:
 *                   statusCode: 406
 *                   message: Your Email or Password is incorrect!
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.route('/login')
  .post(authValidation.login, authController.login)

/**
 * @swagger
 * /auth/google-login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login with Google OAuth2
 *     description: |
 *       Authenticate user using Google ID token.
 *       - Auto-creates account if email doesn't exist
 *       - New accounts: provider='google', password=null, isActive=true (Google already verified)
 *       - Existing accounts: Uses current account data
 *       - Returns JWT tokens in HTTP-only cookies same as regular login
 *       - Google users CANNOT use forgot/reset password (no password stored)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Google ID token from Google Sign-In SDK
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6IjdlM...
 *     responses:
 *       200:
 *         description: Google login successful - Tokens set in HTTP-only cookies
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: accessToken=eyJhbG...; HttpOnly; Secure; SameSite=None
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid Google token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
Router.route('/google-login')
  .post(authController.googleLogin)

/**
 * @swagger
 * /auth/verify-account:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Verify user account via email
 *     description: |
 *       Activate user account by verifying email address with token sent to email.
 *       - Token is UUID format (never expires, only removed when account verified)
 *       - This endpoint is called when user clicks verification link in email
 *       - After verification, user can login with email/password
 *       - Accounts with provider='google' are auto-verified (no need for this endpoint)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - token
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *                 description: Email address of the account to verify
 *               token:
 *                 type: string
 *                 example: a1b2c3d4-e5f6-7890-abcd-ef1234567890
 *                 description: Verification token sent to user's email (UUID, no expiration)
 *     responses:
 *       200:
 *         description: Account verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account verified successfully! You can now log in.
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Already verified or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               alreadyVerified:
 *                 value:
 *                   statusCode: 400
 *                   message: Account is already verified!
 *               invalidToken:
 *                 value:
 *                   statusCode: 400
 *                   message: Invalid verification token!
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               statusCode: 404
 *               message: Account not found!
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.route('/verify-account')
  .post(authValidation.verifyAccount, authController.verifyAccount)

/**
 * @swagger
 * /auth/logout:
 *   delete:
 *     tags:
 *       - Authentication
 *     summary: Logout current user
 *     description: Clear authentication cookies and end user session
 *     responses:
 *       204:
 *         description: Logout successful - Cookies cleared
 *       500:
 *         description: Server error
 */
Router.route('/logout')
  .delete(authController.logout)

/**
 * @swagger
 * /auth/refresh-token:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Refresh access token
 *     description: Generate new access token using refresh token from cookie. Requires valid authentication.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: New access token generated
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: accessToken=newToken...; HttpOnly; Secure
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       403:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               statusCode: 403
 *               message: Please Sign In! (Error from refresh Token)
 */
Router.route('/refresh-token')
  .get(
    authMiddleware.isAuthorized,
    authController.refreshToken
  )

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Request password reset
 *     description: |
 *       Send password reset email with time-limited token (15 minutes).
 *       - NOT available for Google OAuth users (provider='google')
 *       - Token process: Generate random 32 bytes → Hash SHA256 → Store in DB
 *       - Email contains raw token (unhashed) in reset link
 *       - Token expires after 15 minutes (TOKEN_EXPIRY.RESET_PASSWORD)
 *       - If email fails: Auto-rollback (clear token from DB)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *                 description: Email address of the account
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset link has been sent to your email
 *                 email:
 *                   type: string
 *                   example: user@example.com
 *       400:
 *         description: Google account cannot reset password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               statusCode: 400
 *               message: Google accounts cannot reset password. Please use Google Sign-In.
 *       404:
 *         description: No account found with this email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: Email service error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.route('/forgot-password')
  .post(
    authValidation.forgotPassword,
    authController.forgotPassword
  )

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Reset password with token
 *     description: |
 *       Set new password using reset token from email.
 *       - Token expires in 15 minutes from forgot-password request
 *       - Process: Hash token from URL (SHA256) → Find user with matching hashed token
 *       - Check resetPasswordExpires > now (not expired)
 *       - Update password (bcrypt hashed) and clear reset token fields
 *       - Password requirements: Min 8 chars, uppercase, lowercase, number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Reset token received via email (raw, unhashed)
 *                 example: a1b2c3d4e5f6...
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewSecurePass123!
 *                 description: New password (min 8 chars, must contain uppercase, lowercase, number)
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password has been reset successfully
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               statusCode: 400
 *               message: Invalid or expired reset token
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.route('/reset-password')
  .post(
    authValidation.resetPassword,
    authController.resetPassword
  )

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     tags:
 *       - Authentication
 *     summary: Change password (authenticated users)
 *     description: |
 *       Change password for logged-in users.
 *       - Requires authentication (valid accessToken in cookie)
 *       - MUST verify current password before allowing change
 *       - Different from reset-password (doesn't need current password)
 *       - Password requirements: Min 8 chars, uppercase, lowercase, number
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *             properties:
 *               current_password:
 *                 type: string
 *                 format: password
 *                 example: CurrentPass123!
 *                 description: Current password for verification
 *               new_password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewSecurePass456!
 *                 description: New password (min 8 chars, must contain uppercase, lowercase, number)
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password changed successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       406:
 *         description: Current password is incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               statusCode: 406
 *               message: Your Current Password is incorrect!
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
Router.route('/change-password')
  .put(
    authMiddleware.isAuthorized,
    authValidation.changePassword,
    authController.changePassword
  )

export const authRoute = Router