import 'dotenv/config';

export const env = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGODB_URI,
  isProduction: process.env.NODE_ENV === 'production',
};
