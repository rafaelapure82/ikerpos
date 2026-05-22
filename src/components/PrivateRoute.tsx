import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useStore } from '../store.js';

export default function PrivateRoute() {
  const { user } = useStore();
  return user && user.token ? <Outlet /> : <Navigate to="/login" replace />;
}
