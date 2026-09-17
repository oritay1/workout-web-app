import mongoose from 'mongoose';

export function getHealth() {
  return {
    status: 'ok',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };
}
