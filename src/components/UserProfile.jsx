import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import styles from './UserProfile.module.css';

// Avatar background colors — cycles based on first letter
const AVATAR_COLORS = [
  '#4f46e5', '#0891b2', '#059669', '#d97706',
  '#dc2626', '#7c3aed', '#db2777', '#0284c7',
];

function getAvatarColor(name = '') {
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] || AVATAR_COLORS[0];
}

function UserProfile({ showDropdown = true }) {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // Fetch user data from Firestore using current UID
  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) { setLoading(false); return; }

      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserData({ uid: currentUser.uid, ...userSnap.data() });
        } else {
          // Fallback: use Auth display name or email
          setUserData({
            uid: currentUser.uid,
            name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
            email: currentUser.email,
          });
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        setUserData({
          uid: currentUser.uid,
          name: currentUser.email?.split('@')[0] || 'User',
          email: currentUser.email,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    sessionStorage.removeItem('screenSharingActive');
    await signOut(auth);
    navigate('/');
  };

  if (loading) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skeletonAvatar} />
        <div className={styles.skeletonName} />
      </div>
    );
  }

  if (!userData) return null;

  const initial = (userData.name || 'U').charAt(0).toUpperCase();
  const avatarColor = getAvatarColor(userData.name || 'U');

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      {/* ── Avatar + Name pill ── */}
      <button
        className={styles.pill}
        onClick={() => showDropdown && setOpen(prev => !prev)}
        style={{ cursor: showDropdown ? 'pointer' : 'default' }}
        aria-haspopup={showDropdown}
        aria-expanded={open}
      >
        <span
          className={styles.avatar}
          style={{ backgroundColor: avatarColor }}
          aria-label={`Avatar for ${userData.name}`}
        >
          {initial}
        </span>
        <span className={styles.name}>{userData.name}</span>
        {showDropdown && (
          <svg
            className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
            width="12" height="12" viewBox="0 0 12 12" fill="none"
          >
            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* ── Dropdown ── */}
      {showDropdown && open && (
        <div className={styles.dropdown} role="menu">
          <div className={styles.dropdownHeader}>
            <span
              className={styles.dropdownAvatar}
              style={{ backgroundColor: avatarColor }}
            >
              {initial}
            </span>
            <div className={styles.dropdownInfo}>
              <span className={styles.dropdownName}>{userData.name}</span>
              <span className={styles.dropdownEmail}>{userData.email}</span>
            </div>
          </div>
          <div className={styles.divider} />
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            role="menuitem"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
