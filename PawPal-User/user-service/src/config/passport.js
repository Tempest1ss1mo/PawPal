const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback';

// Configure Google OAuth2 Strategy
passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Extract user information from Google profile
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    const name = profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim();
    const googleId = profile.id;
    const profileImageUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

    if (!email) {
      return done(new Error('No email found in Google profile'), null);
    }

    console.log('🔐 OAuth2 callback - Looking for user with email:', email);
    
    // Check if user already exists by email
    let user = await User.findByEmail(email);
    console.log('🔐 OAuth2 callback - User lookup result:', user ? `Found user ID ${user.id}` : 'User not found');

    if (user) {
      // User exists, update Google ID if not set
      if (!user.google_id) {
        await User.updateGoogleId(user.id, googleId);
        user.google_id = googleId;
      }
      return done(null, user);
    } else {
      // Create new user with Google account
      // Default role to 'owner' if not specified
      const newUser = {
        name: name,
        email: email,
        role: 'owner', // Default role
        google_id: googleId,
        profile_image_url: profileImageUrl
      };

      console.log('🔐 OAuth2 callback - Creating new user with email:', email);
      const createdUser = await User.create(newUser);
      console.log('🔐 OAuth2 callback - User created successfully, ID:', createdUser.id, 'Email:', createdUser.email, 'Google ID:', createdUser.google_id);
      return done(null, createdUser);
    }
  } catch (error) {
    console.error('Error in Google OAuth strategy:', error);
    return done(error, null);
  }
}));

// Serialize user for session (if using sessions)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session (if using sessions)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;

