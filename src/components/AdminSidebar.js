import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AdminSidebar({ activeTab }) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const menuItems = [
    { key: 'dashboard', icon: '💎', label: 'Dashboard', path: '/admin/dashboard' },
    { key: 'exams', icon: '📝', label: 'Exams', path: '/admin/dashboard' },
    { key: 'questions', icon: '📂', label: 'Question Bank', path: '/admin/dashboard' },
    { key: 'monitoring', icon: '🌐', label: 'Live Monitor', path: '/admin/dashboard' },
    { key: 'analytics', icon: '📊', label: 'Analytics', path: '/admin/dashboard' },
    { key: 'results', icon: '🏆', label: 'Results', path: '/admin/dashboard' },
  ];

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'sidebar-width-styles';
    style.textContent = `
      :root {
        --sidebar-width: ${isCollapsed ? '80px' : '260px'};
        --primary-blue: #0062ff;
      }
      .admin-main-content {
        margin-left: calc(var(--sidebar-width) + 15px) !important;
        transition: margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      .admin-sidebar-transition {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      .sidebar-item-hover:hover {
        background-color: rgba(255, 255, 255, 0.12) !important;
        transform: translateX(4px);
      }
    `;
    const oldStyle = document.getElementById('sidebar-width-styles');
    if (oldStyle) oldStyle.remove();
    document.head.appendChild(style);
  }, [isCollapsed]);

  const handleNav = (item) => {
    navigate(`/admin/dashboard?tab=${item.key}`);
  };

  return (
    <div style={{
      ...styles.sidebar,
      width: isCollapsed ? '80px' : '260px',
    }} className="admin-sidebar-transition">
      
      {/* Sidebar Header - Only Arrow Toggle */}
      <div style={{...styles.header, justifyContent: isCollapsed ? 'center' : 'flex-end'}}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            ...styles.toggleBtn,
            backgroundColor: isCollapsed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
            width: isCollapsed ? '45px' : '45px',
            height: '45px',
            fontSize: '18px'
          }}
        >
          {isCollapsed ? '〉' : '〈'}
        </button>
      </div>

      <nav style={styles.sidebarNav}>
        {menuItems.map(item => (
          <button key={item.key}
            className={activeTab !== item.key ? "sidebar-item-hover" : ""}
            style={{
              ...styles.sidebarTab, 
              ...(activeTab === item.key ? styles.activeSidebarTab : {}),
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '12px 0' : '12px 15px',
              gap: isCollapsed ? '0' : '10px'
            }}
            onClick={() => handleNav(item)}
          >
            <span style={{ 
              fontSize: '20px', 
              width: isCollapsed ? 'auto' : '24px', 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>{item.icon}</span>
            {!isCollapsed && (
              <span style={{ 
                whiteSpace: 'nowrap', 
                fontSize: '15px',
                fontWeight: activeTab === item.key ? '800' : '600',
                color: 'white'
              }}>{item.label}</span>
            )}
            {!isCollapsed && <span style={{fontSize: '12px', opacity: 0.5, marginLeft: 'auto'}}>〉</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}

const styles = {
  sidebar: {
    backgroundColor: '#0062ff',
    color: 'white',
    height: 'calc(100vh - 120px)',
    position: 'fixed',
    left: '20px',
    top: '95px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 15px 35px rgba(0,98,255,0.25)',
    zIndex: 900,
    overflowX: 'hidden',
    borderRadius: '30px',
    paddingBottom: '20px'
  },
  header: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: '1.2'
  },
  toggleBtn: {
    border: 'none',
    color: 'white',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '900',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  },
  sidebarNav: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  sidebarTab: {
    border: 'none',
    backgroundColor: 'transparent',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    borderRadius: '15px',
  },
  activeSidebarTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    boxShadow: 'inset 4px 0 0 white',
    fontWeight: '800'
  }
};

export default AdminSidebar;
