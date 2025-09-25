import React from 'react';

const SimpleApp: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#2E2E2E', 
      color: 'white',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>MySQL Desktop Client - 简化版本</h1>
      <p>如果您能看到此消息，说明React应用程序正在正常运行。</p>
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#1e1e1e', 
        borderRadius: '5px' 
      }}>
        <h3>应用状态：</h3>
        <ul>
          <li>✅ React 组件正常渲染</li>
          <li>✅ JavaScript 正常执行</li>
          <li>⏳ 准备加载完整应用</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleApp;