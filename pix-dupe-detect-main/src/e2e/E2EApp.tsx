import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import E2ESignIn from '../pages/e2e/E2ESignIn';
import E2EAdminSessions from '../pages/e2e/E2EAdminSessions';
import E2EUploadPage from '../pages/e2e/E2EUploadPage';

export default function E2EApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<E2ESignIn />} />
        <Route path="/admin/sessions" element={<E2EAdminSessions />} />
        <Route path="/upload" element={<E2EUploadPage />} />
        <Route path="/" element={<Navigate to="/signin" replace />} />
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
