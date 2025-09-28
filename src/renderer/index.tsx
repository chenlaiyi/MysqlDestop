import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import CustomThemeProvider from './theme/ThemeProvider';

const container = document.getElementById('root');
if (!container) {
  console.error('找不到 root 容器元素！');
  document.body.innerHTML = '<div style="color: red; padding: 20px;">错误：找不到root元素</div>';
} else {
  const root = createRoot(container);
  root.render(
    <CustomThemeProvider>
      <App />
    </CustomThemeProvider>
  );
}
