import { useState, useEffect } from 'react';
import './App.css';

// API Base URL (sử dụng proxy trong Vite)
const API_URL = '/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

function App() {
  // App navigation state: 'landing' | 'login' | 'register' | 'onboarding' | 'dashboard' | 'exercise_list' | 'admin_users' | 'admin_exercises'
  const [appState, setAppState] = useState('landing');
  
  // Auth & Data state
  const [usersDb, setUsersDb] = useState([]); // Used by admin
  const [exercisesDb, setExercisesDb] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Dropdown state for user menu
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Forms state
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');
  const [activationTokenForTest, setActivationTokenForTest] = useState(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetTokenForTest, setResetTokenForTest] = useState(null);
  const [resetPassword, setResetPassword] = useState('');

  // Onboarding Wizard step
  const [wizardStep, setWizardStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    name: '', dob: '01-01-2000', gender: 'Nam', height: 170, weight: 65, goal: 'build_muscle', equipment: 'dumbbell', experience: 'active'
  });

  // Filter state for exercise list
  const [muscleFilter, setMuscleFilter] = useState('Tất cả');
  
  // Edit Exercises state
  const [isEditingExercises, setIsEditingExercises] = useState(false);
  const [tempExercises, setTempExercises] = useState({
    "Thứ 2": [], "Thứ 3": [], "Thứ 4": [], "Thứ 5": [], "Thứ 6": [], "Thứ 7": [], "Chủ Nhật": []
  });
  const [editActiveDay, setEditActiveDay] = useState("Thứ 2");
  const [viewActiveDay, setViewActiveDay] = useState("Thứ 2");
  const [editMuscleFilter, setEditMuscleFilter] = useState('Tất cả');

  // Active tab inside Dashboard
  const [dashboardActiveTab, setDashboardActiveTab] = useState('workouts'); // 'workouts' | 'nutrition' | 'mobile_app'

  // Admin state
  const [adminNewExercise, setAdminNewExercise] = useState({
    name: '', muscle_group: 'Ngực', difficulty: 'beginner', equipment: 'none', calories_estimated: 10, recommended_sets_reps: '3 hiệp x 10 lần', description: '', emoji: '💪'
  });
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  const [adminExerciseFilter, setAdminExerciseFilter] = useState('Tất cả');
  const [adminNewUser, setAdminNewUser] = useState({ username: '', email: '', password: '', confirmPassword: '', is_admin: false });

  // Close dropdown when clicking outside (simple hack for demo)
  useEffect(() => {
    const closeDropdown = () => setIsDropdownOpen(false);
    window.addEventListener('click', closeDropdown);
    return () => window.removeEventListener('click', closeDropdown);
  }, []);

  // Fetch initial data & auto-login
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingData(true);
      try {
        // Fetch exercises
        const exRes = await fetch(`${API_URL}/exercises`);
        if (exRes.ok) {
          const exercises = await exRes.json();
          setExercisesDb(exercises);
        }

        // Check auth token
        const token = localStorage.getItem('token');
        if (token) {
          const userRes = await fetch(`${API_URL}/auth/me`, { headers: getAuthHeaders() });
          if (userRes.ok) {
            const user = await userRes.json();
            
            // If user is not admin, fetch profile
            if (!user.is_admin && user.has_profile) {
              const profileRes = await fetch(`${API_URL}/profile`, { headers: getAuthHeaders() });
              if (profileRes.ok) {
                const profile = await profileRes.json();
                user.userData = profile;
                user.aiOutput = runAIRecommendation(profile);
              }
            } else if (user.is_admin) {
              const usersRes = await fetch(`${API_URL}/users`, { headers: getAuthHeaders() });
              if (usersRes.ok) {
                setUsersDb(await usersRes.json());
              }
            }
            
            setCurrentUser(user);
            if (user.is_admin) setAppState('admin_users');
            else if (user.has_profile) setAppState('dashboard');
            else setAppState('landing'); // or onboarding
          } else {
            localStorage.removeItem('token'); // Invalid token
          }
        }
      } catch (err) {
        console.error("Lỗi khi load dữ liệu ban đầu:", err);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchInitialData();
  }, []);

  // ==========================================================================
  // AUTHENTICATION HANDLERS
  // ==========================================================================
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginForm.identifier, password: loginForm.password })
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        
        // Fetch user info
        const userRes = await fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${data.access_token}` } });
        const user = await userRes.json();
        
        if (user.is_admin) {
          setCurrentUser(user);
          setAppState('admin_users');
          // Fetch admin users list
          const usersRes = await fetch(`${API_URL}/users`, { headers: { 'Authorization': `Bearer ${data.access_token}` } });
          if (usersRes.ok) setUsersDb(await usersRes.json());
        } else if (user.has_profile) {
          const profileRes = await fetch(`${API_URL}/profile`, { headers: { 'Authorization': `Bearer ${data.access_token}` } });
          const profile = await profileRes.json();
          user.userData = profile;
          user.aiOutput = runAIRecommendation(profile);
          setCurrentUser(user);
          setAppState('dashboard');
        } else {
          setCurrentUser(user);
          setOnboardingData(prev => ({ ...prev, name: user.username }));
          setAppState('onboarding');
          setWizardStep(1);
        }
        setLoginForm({ identifier: '', password: '' });
      } else {
        setAuthError(data.detail || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    } catch (err) {
      setAuthError('Không thể kết nối đến máy chủ.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setAuthError('Mật khẩu xác nhận không khớp.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: registerForm.username, email: registerForm.email, password: registerForm.password })
      });
      const data = await res.json();

      if (res.ok) {
        setActivationTokenForTest(data.activation_token);
        setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });
        setAppState('activation_pending');
      } else {
        setAuthError(data.detail || 'Tên đăng nhập hoặc Email đã tồn tại.');
      }
    } catch (err) {
      setAuthError('Không thể kết nối đến máy chủ.');
    }
  };

  const handleActivateAccount = async (token) => {
    try {
      const res = await fetch(`${API_URL}/auth/activate/${token}`);
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setActivationTokenForTest(null);
        setAppState('login');
      } else {
        alert(data.detail || 'Lỗi kích hoạt');
      }
    } catch (err) {
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setAppState('landing');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (res.ok) {
        if (data.reset_token) setResetTokenForTest(data.reset_token);
        setAppState('forgot_password_pending');
      } else {
        setAuthError(data.detail || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      setAuthError('Không thể kết nối đến máy chủ.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetTokenForTest, new_password: resetPassword })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
        setAppState('login');
      } else {
        setAuthError(data.detail || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      setAuthError('Không thể kết nối đến máy chủ.');
    }
  };

  // ==========================================================================
  // CLIENT-SIDE MOCK AI ENGINE (K-Means & Content-based)
  // ==========================================================================
  const runAIRecommendation = (data) => {
    const { bmi, bmi_status, fitness_level_label, tdee, target_calories, goal, workout_schedule, nutrition_plan } = data;
    
    let goalLabel = 'Duy trì vóc dáng';
    if (goal === 'lose_weight') goalLabel = 'Giảm cân & Đốt mỡ';
    else if (goal === 'build_muscle') goalLabel = 'Tăng cơ & Sức mạnh';
    else if (goal === 'improve_endurance') goalLabel = 'Tăng sức bền thể lực';

    let macros = {
        protein: { grams: 0, pct: 25, color: 'var(--color-primary)' },
        carbs: { grams: 0, pct: 50, color: 'var(--color-accent-cyan)' },
        fat: { grams: 0, pct: 25, color: 'var(--color-accent-pink)' }
    };
    let meals = [];
    if (nutrition_plan) {
      try {
        const parsedNutrition = JSON.parse(nutrition_plan);
        macros = {
          protein: { grams: parsedNutrition.macros.protein, pct: goal === 'lose_weight' ? 35 : goal === 'build_muscle' ? 30 : 25, color: 'var(--color-primary)' },
          carbs: { grams: parsedNutrition.macros.carbs, pct: goal === 'lose_weight' ? 40 : goal === 'build_muscle' ? 45 : 55, color: 'var(--color-accent-cyan)' },
          fat: { grams: parsedNutrition.macros.fat, pct: goal === 'improve_endurance' ? 20 : 25, color: 'var(--color-accent-pink)' }
        };
        meals = parsedNutrition.meals;
      } catch (e) { console.error("Parse nutrition error", e) }
    }

    let recommendedExercises = {
        "Thứ 2": [], "Thứ 3": [], "Thứ 4": [], "Thứ 5": [], "Thứ 6": [], "Thứ 7": [], "Chủ Nhật": []
    };
    if (workout_schedule) {
      try {
        const parsed = JSON.parse(workout_schedule);
        if (Array.isArray(parsed)) {
            recommendedExercises["Thứ 2"] = parsed;
        } else {
            recommendedExercises = { ...recommendedExercises, ...parsed };
        }
      } catch (e) { console.error("Parse workout error", e) }
    }

    return {
      bmi, bmiStatus: bmi_status, fitnessLevelLabel: fitness_level_label, tdee: tdee, targetCalories: target_calories, goalLabel,
      macros,
      recommendedExercises,
      meals
    };
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(onboardingData)
      });
      if (res.ok) {
        const savedProfile = await res.json();
        const result = runAIRecommendation(savedProfile);
        
        const updatedUser = {
          ...currentUser,
          name: savedProfile.name,
          has_profile: true,
          userData: savedProfile,
          aiOutput: result
        };
        
        setCurrentUser(updatedUser);
        setAppState('dashboard');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Có lỗi xảy ra khi lưu hồ sơ: ${errData.detail || 'Vui lòng kiểm tra lại thông tin.'}`);
      }
    } catch (err) {
      alert("Lỗi kết nối máy chủ.");
    }
  };

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================
  const renderHeader = () => {
    if (!currentUser || currentUser.isAdmin) return null; // Don't show full header for non-logged in or Admin

    return (
      <header className="app-header">
        <div className="container nav-container">
          <div className="logo-group" onClick={() => setAppState('landing')}>
            <span className="logo-icon">⚡</span>
            <span className="logo-text">AuraFit AI</span>
          </div>
          
          <nav className="nav-menu">
            <button 
              className={`nav-btn ${appState === 'dashboard' ? 'active' : ''}`}
              onClick={() => setAppState('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`nav-btn ${appState === 'exercise_list' ? 'active' : ''}`}
              onClick={() => setAppState('exercise_list')}
            >
              List bài tập hệ thống
            </button>
            
            {/* User Dropdown */}
            <div className="dropdown-container" onClick={(e) => e.stopPropagation()}>
              <button 
                className="nav-btn" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                Tài khoản user ▼
              </button>
              
              {isDropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-item static">👤 {currentUser.username}</div>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      alert('Chức năng Thông tin tài khoản đang được phát triển.');
                      setIsDropdownOpen(false);
                    }}
                  >
                    Thông tin tài khoản
                  </button>
                  <button 
                    className="dropdown-item danger"
                    onClick={() => {
                      handleLogout();
                      setIsDropdownOpen(false);
                    }}
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>
    );
  };

  const getFilteredExercises = () => {
    if (muscleFilter === 'Tất cả') return exercisesDb;
    return exercisesDb.filter(ex => ex.muscle_group === muscleFilter);
  };

  if (isLoadingData) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white', fontSize: '1.2rem' }}>Đang tải dữ liệu hệ thống...</div>;
  }

  if (appState.startsWith('admin_')) {
    return (
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">AuraFit Admin</span>
          </div>
          <nav className="admin-nav">
            <button 
              className={`admin-nav-item ${appState === 'admin_users' ? 'active' : ''}`}
              onClick={() => setAppState('admin_users')}
            >
              👤 Quản lý Users
            </button>
            <button 
              className={`admin-nav-item ${appState === 'admin_exercises' ? 'active' : ''}`}
              onClick={() => setAppState('admin_exercises')}
            >
              🏋️ Quản lý Bài Tập
            </button>
          </nav>
        </aside>

        <main className="admin-main">
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '24px', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {currentUser?.username?.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>Xin chào, <span style={{ color: 'var(--color-primary)' }}>{currentUser?.username}</span>!</span>
            </div>
            <button 
              className="btn-secondary" 
              onClick={handleLogout} 
              style={{ padding: '8px 16px', fontSize: '0.9rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
            >
              🚪 Đăng xuất
            </button>
          </div>

          {appState === 'admin_users' && (
            <div>
              <div className="admin-header">
                <h2>Quản lý Người Dùng</h2>
              </div>

              <div className="glass-card" style={{ marginBottom: '32px', padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Thêm Tài Khoản Mới</h3>
                <div className="admin-form-row">
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tên đăng nhập</label>
                    <input type="text" className="form-input" placeholder="Tên đăng nhập" value={adminNewUser.username} onChange={e => setAdminNewUser({...adminNewUser, username: e.target.value})} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email</label>
                    <input type="email" className="form-input" placeholder="Email" value={adminNewUser.email} onChange={e => setAdminNewUser({...adminNewUser, email: e.target.value})} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mật khẩu</label>
                    <input type="password" className="form-input" placeholder="Mật khẩu" value={adminNewUser.password} onChange={e => setAdminNewUser({...adminNewUser, password: e.target.value})} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Xác nhận mật khẩu</label>
                    <input type="password" className="form-input" placeholder="Xác nhận mật khẩu" value={adminNewUser.confirmPassword} onChange={e => setAdminNewUser({...adminNewUser, confirmPassword: e.target.value})} />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Phân quyền</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 0', height: '100%', minHeight: '48px' }}>
                      <input type="checkbox" id="isAdminCheck" checked={adminNewUser.is_admin} onChange={e => setAdminNewUser({...adminNewUser, is_admin: e.target.checked})} />
                      <label htmlFor="isAdminCheck" style={{ cursor: 'pointer', userSelect: 'none' }}>Quyền Admin</label>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'transparent', userSelect: 'none' }}>Thao tác</label>
                    <button 
                      className="btn-primary"
                      style={{ padding: '14px 28px' }}
                      onClick={async () => {
                        if (!adminNewUser.username || !adminNewUser.email || !adminNewUser.password) return alert('Nhập đủ thông tin');
                        if (adminNewUser.password !== adminNewUser.confirmPassword) return alert('Mật khẩu xác nhận không khớp');
                        try {
                          const res = await fetch(`${API_URL}/users`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                            body: JSON.stringify({
                              username: adminNewUser.username,
                              email: adminNewUser.email,
                              password: adminNewUser.password,
                              is_admin: adminNewUser.is_admin
                            })
                          });
                          if (res.ok) {
                            const usersRes = await fetch(`${API_URL}/users`, { headers: getAuthHeaders() });
                            setUsersDb(await usersRes.json());
                            setAdminNewUser({ username: '', email: '', password: '', confirmPassword: '', is_admin: false });
                          } else {
                            const data = await res.json();
                            alert(data.detail || "Lỗi tạo tài khoản");
                          }
                        } catch (err) { alert('Lỗi kết nối'); }
                      }}
                    >
                      Tạo Tài Khoản
                    </button>
                  </div>
                </div>
              </div>

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Quyền</th>
                      <th>Trạng thái</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersDb.map(u => (
                      <tr key={u.id}>
                        <td>#{u.id}</td>
                        <td style={{ fontWeight: 'bold' }}>{u.username}</td>
                        <td>{u.email}</td>
                        <td>
                          {u.is_admin ? <span className="status-badge" style={{ background: '#9c27b0' }}>Admin</span> : <span className="status-badge">User</span>}
                        </td>
                        <td>
                          {u.has_profile || u.is_admin ? (
                            <span className="status-badge success">Đã xác nhận</span>
                          ) : (
                            <span className="status-badge warning">{u.is_active ? 'Chưa cập nhật' : 'Chưa kích hoạt'}</span>
                          )}
                        </td>
                        <td style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="action-btn"
                            disabled={u.username === 'admin'}
                            style={{ opacity: u.username === 'admin' ? 0.5 : 1 }}
                            onClick={async () => {
                              try {
                                await fetch(`${API_URL}/users/${u.id}/role`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                                  body: JSON.stringify({ is_admin: !u.is_admin })
                                });
                                setUsersDb(usersDb.map(user => user.id === u.id ? { ...user, is_admin: !u.is_admin } : user));
                              } catch (err) { alert('Lỗi') }
                            }}
                          >
                            {u.is_admin ? 'Hạ quyền' : 'Cấp Admin'}
                          </button>
                          <button 
                            className="action-btn delete"
                            disabled={u.username === 'admin'}
                            style={{ opacity: u.username === 'admin' ? 0.5 : 1 }}
                            onClick={async () => {
                              if (window.confirm('Xóa user này?')) {
                                try {
                                  await fetch(`${API_URL}/users/${u.id}`, { method: 'DELETE', headers: getAuthHeaders() });
                                  setUsersDb(usersDb.filter(user => user.id !== u.id));
                                } catch (err) { alert('Lỗi xóa user') }
                              }
                            }}
                          >
                            🗑 Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {appState === 'admin_exercises' && (
            <div>
              <div className="admin-header">
                <h2>Quản lý Bài Tập Hệ Thống</h2>
              </div>
              
              <div className="glass-card" style={{ marginBottom: '32px', padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Thêm Bài Tập Mới</h3>
                <div className="admin-form-row">
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tên bài tập</label>
                    <input type="text" className="form-input" placeholder="Vd: Đẩy tạ đòn" value={adminNewExercise.name} onChange={e => setAdminNewExercise({...adminNewExercise, name: e.target.value})} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nhóm cơ chính</label>
                    <select className="form-input" value={adminNewExercise.muscle_group} onChange={e => setAdminNewExercise({...adminNewExercise, muscle_group: e.target.value})}>
                      <option>Ngực</option><option>Lưng & Xô</option><option>Đùi & Mông</option><option>Bụng</option><option>Tay trước</option><option>Tay sau</option><option>Vai</option><option>Toàn thân</option><option>Cardio</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mức độ (Độ khó)</label>
                    <select className="form-input" value={adminNewExercise.difficulty} onChange={e => setAdminNewExercise({...adminNewExercise, difficulty: e.target.value})}>
                      <option value="beginner">Sơ cấp (Beginner)</option><option value="intermediate">Trung cấp (Intermediate)</option><option value="advanced">Nâng cao (Advanced)</option>
                    </select>
                  </div>
                </div>
                <div className="admin-form-row">
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Dụng cụ</label>
                    <select className="form-input" value={adminNewExercise.equipment} onChange={e => setAdminNewExercise({...adminNewExercise, equipment: e.target.value})}>
                      <option value="none">Không dụng cụ</option>
                      <option value="dumbbell">Tạ đôi</option>
                      <option value="barbell">Tạ đòn</option>
                      <option value="machine">Máy tập (Machine)</option>
                      <option value="cable">Cáp kéo (Cable)</option>
                      <option value="gym">Gym chung</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Khuyến nghị (Hiệp/Lần/Thời gian)</label>
                    <input type="text" className="form-input" placeholder="Vd: 3 hiệp x 10 lần, hoặc 30 phút" value={adminNewExercise.recommended_sets_reps} onChange={e => setAdminNewExercise({...adminNewExercise, recommended_sets_reps: e.target.value})} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Lượng Calo tiêu hao ước tính (Kcal)</label>
                    <input type="number" className="form-input" placeholder="Vd: 15" value={adminNewExercise.calories_estimated} onChange={e => setAdminNewExercise({...adminNewExercise, calories_estimated: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="admin-form-row" style={{ alignItems: 'center' }}>
                  <input type="text" className="form-input" style={{ flex: 3 }} placeholder="Mô tả" value={adminNewExercise.description} onChange={e => setAdminNewExercise({...adminNewExercise, description: e.target.value})} />
                  <select 
                    className="form-input" 
                    style={{ flex: 1 }} 
                    value={adminNewExercise.emoji} 
                    onChange={e => setAdminNewExercise({...adminNewExercise, emoji: e.target.value})}
                  >
                    <option value="💪">💪 Cơ bắp</option>
                    <option value="🏋️">🏋️ Cử tạ</option>
                    <option value="🏃">🏃 Chạy bộ</option>
                    <option value="🚴">🚴 Đạp xe</option>
                    <option value="🤸">🤸 Thể dục</option>
                    <option value="🪢">🪢 Nhảy dây</option>
                    <option value="🦵">🦵 Cơ chân</option>
                    <option value="🧘‍♀️">🧘‍♀️ Yoga</option>
                    <option value="🦾">🦾 Tay cơ khí</option>
                    <option value="🔥">🔥 Đốt mỡ</option>
                    <option value="❤️">❤️ Nhịp tim</option>
                    <option value="🧗">🧗 Leo núi</option>
                    <option value="🏊">🏊 Bơi lội</option>
                  </select>
                  <button 
                    className="btn-primary"
                    onClick={async () => {
                      if (!adminNewExercise.name) return;
                      try {
                        const method = editingExerciseId ? 'PUT' : 'POST';
                        const url = editingExerciseId ? `${API_URL}/exercises/${editingExerciseId}` : `${API_URL}/exercises`;
                        
                        const res = await fetch(url, {
                          method,
                          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                          body: JSON.stringify(adminNewExercise)
                        });
                        
                        if (res.ok) {
                          const savedEx = await res.json();
                          if (editingExerciseId) {
                            setExercisesDb(exercisesDb.map(e => e.id === editingExerciseId ? savedEx : e));
                            setEditingExerciseId(null);
                          } else {
                            setExercisesDb([savedEx, ...exercisesDb]);
                          }
                          setAdminNewExercise({
                            name: '', muscle_group: 'Ngực', difficulty: 'beginner', equipment: 'none', calories_estimated: 10, recommended_sets_reps: '3 hiệp x 10 lần', description: '', emoji: '💪'
                          });
                        } else { alert("Lỗi khi lưu bài tập"); }
                      } catch (err) { alert('Lỗi kết nối'); }
                    }}
                  >
                    {editingExerciseId ? 'Cập nhật' : 'Thêm +'}
                  </button>
                  {editingExerciseId && (
                    <button 
                      className="btn-secondary"
                      onClick={() => {
                        setEditingExerciseId(null);
                        setAdminNewExercise({
                          name: '', muscle_group: 'Ngực', difficulty: 'beginner', equipment: 'none', calories_estimated: 10, recommended_sets_reps: '3 hiệp x 10 lần', description: '', emoji: '💪'
                        });
                      }}
                    >
                      Hủy
                    </button>
                  )}
                </div>
              </div>

              <div className="admin-table-container">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: 600 }}>Lọc theo nhóm cơ:</span>
                  <select 
                    className="form-input" 
                    style={{ width: '200px' }} 
                    value={adminExerciseFilter} 
                    onChange={e => setAdminExerciseFilter(e.target.value)}
                  >
                    <option value="Tất cả">Tất cả</option>
                    <option value="Ngực">Ngực</option>
                    <option value="Lưng & Xô">Lưng & Xô</option>
                    <option value="Đùi & Mông">Đùi & Mông</option>
                    <option value="Bụng">Bụng</option>
                    <option value="Tay trước">Tay trước</option>
                    <option value="Tay sau">Tay sau</option>
                    <option value="Vai">Vai</option>
                    <option value="Toàn thân">Toàn thân</option>
                    <option value="Cardio">Cardio</option>
                  </select>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Tên Bài Tập</th>
                      <th>Nhóm Cơ</th>
                      <th>Cấp độ</th>
                      <th>Dụng cụ</th>
                      <th>Khuyến nghị</th>
                      <th>Calo/Phút</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(adminExerciseFilter === 'Tất cả' ? exercisesDb : exercisesDb.filter(ex => ex.muscle_group === adminExerciseFilter)).map(ex => (
                      <tr key={ex.id}>
                        <td style={{ fontWeight: 'bold' }}>{ex.emoji} {ex.name}</td>
                        <td>{ex.muscle_group}</td>
                        <td><span className="status-badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{ex.difficulty}</span></td>
                        <td>{ex.equipment}</td>
                        <td style={{ color: 'var(--color-primary)' }}>{ex.recommended_sets_reps}</td>
                        <td style={{ color: 'var(--color-accent-emerald)', fontWeight: 'bold' }}>{ex.calories_estimated} kcal</td>
                        <td>
                          <button 
                            className="action-btn"
                            style={{ marginRight: '8px' }}
                            onClick={() => {
                              setEditingExerciseId(ex.id);
                              setAdminNewExercise({
                                name: ex.name, muscle_group: ex.muscle_group, difficulty: ex.difficulty, equipment: ex.equipment,
                                calories_estimated: ex.calories_estimated, recommended_sets_reps: ex.recommended_sets_reps,
                                description: ex.description, emoji: ex.emoji || ''
                              });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            ✏ Sửa
                          </button>
                          <button 
                            className="action-btn delete"
                            onClick={async () => {
                              if (window.confirm('Xóa bài tập này?')) {
                                try {
                                  const res = await fetch(`${API_URL}/exercises/${ex.id}`, { method: 'DELETE', headers: getAuthHeaders() });
                                  if (res.ok) setExercisesDb(exercisesDb.filter(e => e.id !== ex.id));
                                  else alert("Không thể xóa bài tập");
                                } catch (err) { alert('Lỗi kết nối'); }
                              }
                            }}
                          >
                            🗑 Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app-root">
      {renderHeader()}

      <main style={{ flex: 1 }}>
        <div className="container">

          {/* ==========================================================================
             1. LANDING PAGE
             ========================================================================== */}
          {appState === 'landing' && (
            <section className="hero-section" style={{ marginTop: '40px' }}>
              <div className="hero-badge">AI-INTEGRATED FITNESS & NUTRITION COACHING</div>
              <h1>Trợ Lý Tập Luyện & Dinh Dưỡng Trí Tuệ Nhân Tạo Cao Cấp</h1>
              <p className="hero-subtitle">
                Ứng dụng huấn luyện viên ảo tối ưu hóa thể hình của bạn. Cá nhân hóa 100% dựa trên chỉ số sinh học và mục tiêu luyện tập.
              </p>
              <div className="hero-actions">
                {currentUser ? (
                  <button className="btn-primary" onClick={() => setAppState('dashboard')}>
                    Trở Về Dashboard
                  </button>
                ) : (
                  <>
                    <button className="btn-primary" onClick={() => setAppState('login')}>
                      Đăng Nhập
                    </button>
                    <button className="btn-secondary" onClick={() => setAppState('register')}>
                      Đăng Ký
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          {/* ==========================================================================
             2. LOGIN & REGISTER
             ========================================================================== */}
          {appState === 'login' && (
            <div className="auth-container">
              <div className="glass-card auth-card">
                <h2>Đăng Nhập</h2>
                <p>Mừng bạn trở lại với AuraFit AI</p>
                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="form-label">Tên tài khoản hoặc Email</label>
                    <input 
                      type="text" 
                      required 
                      className="form-input" 
                      value={loginForm.identifier}
                      onChange={(e) => setLoginForm({...loginForm, identifier: e.target.value})}
                      placeholder="Nhập tên đăng nhập hoặc email..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mật khẩu</label>
                    <input 
                      type="password" 
                      required 
                      className="form-input" 
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      placeholder="••••••••"
                    />
                  </div>
                  
                  {authError && <div className="form-error">{authError}</div>}
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', marginBottom: '24px' }}>
                    <span className="text-link" onClick={() => setAppState('forgot_password')} style={{ fontSize: '0.85rem' }}>Quên mật khẩu?</span>
                  </div>

                  <button type="submit" className="btn-primary full-width">Đăng Nhập</button>
                </form>
                
                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Chưa có tài khoản? <span className="text-link" onClick={() => setAppState('register')}>Đăng ký</span>
                </div>
              </div>
            </div>
          )}
          {appState === 'activation_pending' && (
            <div className="auth-container">
              <div className="glass-card auth-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✉️</div>
                <h2 style={{ color: 'var(--color-primary)' }}>Kiểm tra Email</h2>
                <p>Một liên kết kích hoạt đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư để hoàn tất đăng ký.</p>
                
                {activationTokenForTest && (
                  <div style={{ marginTop: '32px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px dashed var(--color-primary)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      *Khu vực dành cho Dev Test (Giả lập việc click vào link trong Email)
                    </p>
                    <button 
                      className="btn-primary" 
                      onClick={() => handleActivateAccount(activationTokenForTest)}
                    >
                      Xác thực Tài khoản
                    </button>
                  </div>
                )}
                
                <div style={{ marginTop: '24px' }}>
                  <button className="btn-secondary" onClick={() => setAppState('login')}>Quay về Đăng nhập</button>
                </div>
              </div>
            </div>
          )}

          {appState === 'forgot_password' && (
            <div className="auth-container">
              <div className="glass-card auth-card">
                <h2>Quên mật khẩu</h2>
                <p>Nhập email để nhận link đặt lại mật khẩu</p>
                <form onSubmit={handleForgotPassword}>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" required className="form-input" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="Nhập email..." />
                  </div>
                  {authError && <div className="form-error">{authError}</div>}
                  <button type="submit" className="btn-primary full-width" style={{ marginTop: '16px' }}>Gửi Link</button>
                </form>
                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem' }}>
                  <span className="text-link" onClick={() => setAppState('login')}>Quay về đăng nhập</span>
                </div>
              </div>
            </div>
          )}

          {appState === 'forgot_password_pending' && (
            <div className="auth-container">
              <div className="glass-card auth-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✉️</div>
                <h2 style={{ color: 'var(--color-primary)' }}>Kiểm tra Email</h2>
                <p>Một liên kết khôi phục mật khẩu đã được gửi đến email của bạn.</p>
                
                {resetTokenForTest && (
                  <div style={{ marginTop: '32px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px dashed var(--color-primary)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      *Khu vực dành cho Dev Test (Giả lập việc click vào link trong Email)
                    </p>
                    <button className="btn-primary" onClick={() => setAppState('reset_password')}>Mở form Đặt Lại Mật Khẩu</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {appState === 'reset_password' && (
            <div className="auth-container">
              <div className="glass-card auth-card">
                <h2>Đặt lại mật khẩu</h2>
                <p>Nhập mật khẩu mới cho tài khoản của bạn</p>
                <form onSubmit={handleResetPassword}>
                  <div className="form-group">
                    <label className="form-label">Mật khẩu mới</label>
                    <input type="password" required className="form-input" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  {authError && <div className="form-error">{authError}</div>}
                  <button type="submit" className="btn-primary full-width" style={{ marginTop: '16px' }}>Đổi Mật Khẩu</button>
                </form>
              </div>
            </div>
          )}

          {appState === 'register' && (
            <div className="auth-container">
              <div className="glass-card auth-card">
                <h2>Tạo Tài Khoản</h2>
                <p>Bắt đầu hành trình cùng AuraFit AI</p>
                <form onSubmit={handleRegister}>
                  <div className="form-group">
                    <label className="form-label">Tên tài khoản</label>
                    <input 
                      type="text" 
                      required 
                      className="form-input" 
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input 
                      type="email" 
                      required 
                      className="form-input" 
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mật khẩu</label>
                    <input 
                      type="password" 
                      required 
                      className="form-input" 
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Xác nhận mật khẩu</label>
                    <input 
                      type="password" 
                      required 
                      className="form-input" 
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                    />
                  </div>
                  
                  {authError && <div className="form-error" style={{ marginBottom: '16px' }}>{authError}</div>}
                  
                  <button type="submit" className="btn-primary full-width">Đăng Ký Tài Khoản</button>
                </form>
                
                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Đã có tài khoản? <span className="text-link" onClick={() => setAppState('login')}>Đăng nhập</span>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================================================
             3. ONBOARDING WIZARD
             ========================================================================== */}
          {appState === 'onboarding' && (
            <div className="wizard-container glass-card" style={{ marginTop: '50px' }}>
              <h2 style={{ textAlign: 'center', marginBottom: '12px' }}>AI Khảo Sát Thể Trạng</h2>
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px' }}>
                Điền thông tin để thuật toán AI phân lớp và đề xuất chế độ tốt nhất dành riêng cho bạn.
              </p>

              <div className="wizard-progress">
                <div className="wizard-progress-bar"></div>
                <div className="wizard-progress-fill" style={{ width: `${((wizardStep - 1) / 3) * 100}%` }}></div>
                <div className={`progress-step ${wizardStep >= 1 ? 'active' : ''} ${wizardStep > 1 ? 'completed' : ''}`}>1</div>
                <div className={`progress-step ${wizardStep >= 2 ? 'active' : ''} ${wizardStep > 2 ? 'completed' : ''}`}>2</div>
                <div className={`progress-step ${wizardStep >= 3 ? 'active' : ''} ${wizardStep > 3 ? 'completed' : ''}`}>3</div>
                <div className={`progress-step ${wizardStep >= 4 ? 'active' : ''}`}>4</div>
              </div>

              <form onSubmit={handleOnboardingSubmit}>
                {wizardStep === 1 && (
                  <div className="step-content">
                    <h3 style={{ marginBottom: '20px' }}>Bước 1: Thông tin cơ bản</h3>
                    <div className="form-group">
                      <label className="form-label">Tên hiển thị của bạn</label>
                      <input 
                        type="text" required className="form-input" 
                        value={onboardingData.name}
                        onChange={(e) => setOnboardingData({ ...onboardingData, name: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label className="form-label">Ngày sinh (DD-MM-YYYY)</label>
                        <input type="text" placeholder="VD: 15-08-1998" required className="form-input" value={onboardingData.dob} onChange={(e) => setOnboardingData({ ...onboardingData, dob: e.target.value })} />
                      </div>
                      <div>
                        <label className="form-label">Giới tính</label>
                        <select className="form-input" value={onboardingData.gender} onChange={(e) => setOnboardingData({ ...onboardingData, gender: e.target.value })}>
                          <option>Nam</option><option>Nữ</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
                {wizardStep === 2 && (
                  <div className="step-content">
                    <h3 style={{ marginBottom: '20px' }}>Bước 2: Chỉ số cơ thể</h3>
                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label className="form-label">Chiều cao (cm)</label>
                        <input type="number" min="100" max="250" required className="form-input" value={onboardingData.height} onChange={(e) => setOnboardingData({ ...onboardingData, height: parseInt(e.target.value) || 170 })} />
                      </div>
                      <div>
                        <label className="form-label">Cân nặng (kg)</label>
                        <input type="number" min="30" max="200" required className="form-input" value={onboardingData.weight} onChange={(e) => setOnboardingData({ ...onboardingData, weight: parseInt(e.target.value) || 60 })} />
                      </div>
                    </div>
                  </div>
                )}
                {wizardStep === 3 && (
                  <div className="step-content">
                    <h3 style={{ marginBottom: '20px' }}>Bước 3: Chọn mục tiêu chính</h3>
                    <div className="options-grid">
                      <div className={`option-card ${onboardingData.goal === 'lose_weight' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, goal: 'lose_weight' })}>
                        <span className="option-icon">🔥</span><span className="option-title">Giảm Cân</span>
                      </div>
                      <div className={`option-card ${onboardingData.goal === 'build_muscle' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, goal: 'build_muscle' })}>
                        <span className="option-icon">💪</span><span className="option-title">Tăng Cơ Bắp</span>
                      </div>
                      <div className={`option-card ${onboardingData.goal === 'improve_endurance' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, goal: 'improve_endurance' })}>
                        <span className="option-icon">🏃</span><span className="option-title">Sức Bền</span>
                      </div>
                      <div className={`option-card ${onboardingData.goal === 'stay_fit' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, goal: 'stay_fit' })}>
                        <span className="option-icon">🧘</span><span className="option-title">Duy Trì Dáng</span>
                      </div>
                    </div>
                  </div>
                )}
                {wizardStep === 4 && (
                  <div className="step-content">
                    <h3 style={{ marginBottom: '20px' }}>Bước 4: Thiết bị & Kinh nghiệm</h3>
                    <div className="form-group">
                      <label className="form-label">Dụng cụ tập luyện sẵn có</label>
                      <select className="form-input" value={onboardingData.equipment} onChange={(e) => setOnboardingData({ ...onboardingData, equipment: e.target.value })}>
                        <option value="none">Không có dụng cụ (Calisthenics)</option>
                        <option value="dumbbell">Tạ đôi tay (Dumbbells)</option>
                        <option value="barbell">Tạ đòn thanh dài (Barbell)</option>
                        <option value="gym">Phòng Gym thương mại</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mức độ hoạt động</label>
                      <select className="form-input" value={onboardingData.experience} onChange={(e) => setOnboardingData({ ...onboardingData, experience: e.target.value })}>
                        <option value="sedentary">Ít vận động (Dân văn phòng)</option>
                        <option value="active">Trung bình (Năng động)</option>
                        <option value="athletic">Thể thao chuyên nghiệp</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="wizard-actions">
                  {wizardStep > 1 && (
                    <button type="button" className="btn-secondary" onClick={() => setWizardStep(wizardStep - 1)}>Quay Lại</button>
                  )}
                  {wizardStep < 4 ? (
                    <button type="button" className="btn-primary" onClick={() => setWizardStep(wizardStep + 1)}>Tiếp Tục ➜</button>
                  ) : (
                    <button type="submit" className="btn-primary">Hoàn Thành Profile 🚀</button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* ==========================================================================
             4. DASHBOARD PAGE (NEW LAYOUT)
             ========================================================================== */}
          {appState === 'dashboard' && currentUser?.aiOutput && (
            <div className="dashboard-layout">
              {/* LEFT SIDEBAR: Personal Stats */}
              <aside className="dashboard-sidebar">
                <div className="glass-card profile-card">
                  <div className="avatar-glow" onClick={async () => {
                    const newUrl = prompt('Nhập đường dẫn URL ảnh đại diện của bạn:');
                    if (newUrl) {
                      try {
                        const res = await fetch(`${API_URL}/profile/avatar`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                          body: JSON.stringify({ avatar_url: newUrl })
                        });
                        if (res.ok) {
                          const updated = { ...currentUser };
                          updated.userData.avatar_url = newUrl;
                          setCurrentUser(updated);
                        }
                      } catch (err) { alert('Lỗi cập nhật ảnh'); }
                    }
                  }} style={{ cursor: 'pointer', backgroundImage: currentUser.userData.avatar_url ? `url(${currentUser.userData.avatar_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', color: currentUser.userData.avatar_url ? 'transparent' : 'inherit' }} title="Nhấn để đổi Avatar">
                    {currentUser.userData.gender === 'Nam' ? '🧔' : '👩'}
                  </div>
                  <h3 style={{ marginTop: '12px' }}>{currentUser.username}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>{currentUser.email}</p>

                  <div className="stats-grid" style={{ gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="stat-label">Ngày sinh:</span>
                      <span className="stat-value" style={{ fontSize: '0.9rem' }}>{currentUser.userData.dob}</span>
                    </div>
                    <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="stat-label">Giới tính:</span>
                      <span className="stat-value" style={{ fontSize: '0.9rem' }}>{currentUser.userData.gender}</span>
                    </div>
                    <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="stat-label">Chiều cao:</span>
                      <span className="stat-value" style={{ fontSize: '0.9rem' }}>{currentUser.userData.height} cm</span>
                    </div>
                    <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="stat-label">Cân nặng:</span>
                      <span className="stat-value" style={{ fontSize: '0.9rem' }}>{currentUser.userData.weight} kg</span>
                    </div>
                    <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="stat-label">BMI:</span>
                      <div style={{ textAlign: 'right' }}>
                        <span className="stat-value stat-highlight" style={{ fontSize: '1.1rem' }}>{currentUser.aiOutput.bmi}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentUser.aiOutput.bmiStatus}</div>
                      </div>
                    </div>
                    <div className="stat-item" style={{ marginTop: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
                      <div className="stat-label" style={{ marginBottom: '8px' }}>Mục tiêu chính</div>
                      <div className="stat-value" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-primary)' }}>
                        <span>🎯</span> {currentUser.aiOutput.goalLabel}
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              {/* MAIN CONTENT AREA */}
              <section className="dashboard-main">
                <div className="dashboard-header-flex">
                  <h2>Tổng quan AI Coach</h2>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      setOnboardingData(currentUser.userData);
                      setWizardStep(1);
                      setAppState('onboarding');
                    }}
                  >
                    Khảo sát lại mục tiêu 🔄
                  </button>
                </div>

                <div className="section-tabs">
                  <button 
                    className={`tab-link ${dashboardActiveTab === 'workouts' ? 'active' : ''}`}
                    onClick={() => setDashboardActiveTab('workouts')}
                  >
                    🏋️ Lịch Tập Đề Xuất
                  </button>
                  <button 
                    className={`tab-link ${dashboardActiveTab === 'nutrition' ? 'active' : ''}`}
                    onClick={() => setDashboardActiveTab('nutrition')}
                  >
                    🍳 Chế Độ Dinh Dưỡng
                  </button>
                  <button 
                    className={`tab-link ${dashboardActiveTab === 'mobile_app' ? 'active' : ''}`}
                    onClick={() => setDashboardActiveTab('mobile_app')}
                  >
                    📱 Mobile App
                  </button>
                </div>

                {/* Section 1: Lịch tập đề xuất */}
                {dashboardActiveTab === 'workouts' && (
                  <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3>🏋️ Lịch Tập Đề Xuất</h3>
                      <button className={isEditingExercises ? "btn-primary" : "btn-secondary"} style={{ padding: '6px 12px', fontSize: '0.9rem' }} onClick={() => {
                          if (isEditingExercises) {
                              fetch(`${API_URL}/profile/exercises`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                                  body: JSON.stringify({ exercises: tempExercises })
                              }).then(res => {
                                  if (res.ok) {
                                      const updated = { ...currentUser };
                                      updated.aiOutput.recommendedExercises = tempExercises;
                                      setCurrentUser(updated);
                                      setIsEditingExercises(false);
                                  } else { alert('Lỗi khi lưu bài tập'); }
                              }).catch(() => alert('Lỗi kết nối'));
                          } else {
                              setTempExercises(currentUser.aiOutput.recommendedExercises);
                              setIsEditingExercises(true);
                          }
                      }}>
                          {isEditingExercises ? 'Lưu Thay Đổi' : 'Chỉnh Sửa'}
                      </button>
                    </div>

                    {isEditingExercises && (
                      <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <p style={{ fontSize: '0.95rem', margin: 0 }}>Chọn bài tập từ kho để đưa vào giáo án cá nhân.</p>
                            <span style={{ fontSize: '0.85rem', background: 'var(--color-primary)', padding: '4px 10px', borderRadius: '20px', color: '#fff', fontWeight: 'bold' }}>Đã chọn: {tempExercises[editActiveDay]?.length || 0} bài</span>
                          </div>
                          
                          {/* Day Selector Tabs */}
                          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'].map(day => (
                                <button key={day} onClick={() => setEditActiveDay(day)} style={{ padding: '8px 16px', fontSize: '0.9rem', border: 'none', background: editActiveDay === day ? 'var(--color-primary)' : 'transparent', color: editActiveDay === day ? '#fff' : 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: '8px 8px 0 0', fontWeight: editActiveDay === day ? 'bold' : 'normal', transition: 'all 0.2s' }}>
                                    {day} {tempExercises[day]?.length > 0 && `(${tempExercises[day].length})`}
                                </button>
                            ))}
                          </div>

                          <div className="filter-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px' }}>
                            {['Tất cả', 'Cardio', 'Ngực', 'Lưng & Xô', 'Bụng', 'Vai', 'Đùi & Mông', 'Tay trước', 'Tay sau', 'Toàn thân'].map(muscle => (
                                <button key={muscle} onClick={() => setEditMuscleFilter(muscle)} style={{ padding: '6px 14px', fontSize: '0.85rem', borderRadius: '20px', border: editMuscleFilter === muscle ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)', background: editMuscleFilter === muscle ? 'rgba(56, 189, 248, 0.15)' : 'transparent', color: editMuscleFilter === muscle ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                                    {muscle}
                                </button>
                            ))}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                              {exercisesDb.filter(ex => editMuscleFilter === 'Tất cả' || ex.muscle_group === editMuscleFilter).map(ex => {
                                  const isSelected = tempExercises[editActiveDay]?.find(t => t.id === ex.id);
                                  return (
                                      <div key={ex.id} onClick={() => {
                                          const dayExercises = tempExercises[editActiveDay] || [];
                                          if (isSelected) {
                                              setTempExercises({ ...tempExercises, [editActiveDay]: dayExercises.filter(t => t.id !== ex.id) });
                                          } else {
                                              setTempExercises({ ...tempExercises, [editActiveDay]: [...dayExercises, ex] });
                                          }
                                      }} style={{ padding: '16px 8px', background: isSelected ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '12px', cursor: 'pointer', textAlign: 'center', border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--border-glass)', transition: 'all 0.2s', position: 'relative' }}>
                                          {isSelected && <div style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--color-primary)', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', boxShadow: '0 0 8px rgba(56, 189, 248, 0.5)' }}>✓</div>}
                                          <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{ex.emoji}</div>
                                          <div style={{ fontSize: '0.85rem', lineHeight: '1.3', fontWeight: isSelected ? '600' : 'normal', color: isSelected ? '#fff' : 'var(--text-main)' }}>{ex.name}</div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        {isEditingExercises ? `Danh sách bài tập ngày ${editActiveDay}:` : "Lịch tập theo ngày trong tuần:"}
                      </p>
                      {isEditingExercises && (
                        <div className="detail-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', fontSize: '0.85rem' }}>
                          🔥 Ước tính ({editActiveDay}): <strong>{(tempExercises[editActiveDay] || []).reduce((sum, ex) => sum + (ex.calories_estimated || 0), 0)} kcal</strong>
                        </div>
                      )}
                    </div>

                    {!isEditingExercises ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'].map(day => {
                                const hasExercises = currentUser.aiOutput.recommendedExercises[day]?.length > 0;
                                return (
                                <button key={day} onClick={() => setViewActiveDay(day)} style={{ padding: '8px 16px', fontSize: '0.9rem', border: '1px solid var(--border-glass)', background: viewActiveDay === day ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewActiveDay === day ? '#fff' : 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: '20px', fontWeight: viewActiveDay === day ? 'bold' : 'normal', transition: 'all 0.2s', position: 'relative' }}>
                                    {day}
                                    {hasExercises && <span style={{ position: 'absolute', top: '2px', right: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 6px var(--color-primary)' }}></span>}
                                </button>
                                );
                            })}
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)', borderRadius: '12px', overflow: 'hidden' }}>
                              {(() => {
                                  const dayExercises = currentUser.aiOutput.recommendedExercises[viewActiveDay] || [];
                                  const totalCal = dayExercises.reduce((sum, ex) => sum + (ex.calories_estimated || 0), 0);
                                  
                                  if (dayExercises.length === 0) {
                                      return (
                                          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                                              <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🌱</div>
                                              <h4 style={{ color: 'var(--text-muted)', margin: 0, fontSize: '1.1rem' }}>Hôm nay là ngày nghỉ ngơi phục hồi.</h4>
                                          </div>
                                      );
                                  }

                                  return (
                                      <>
                                        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>Giáo án {viewActiveDay}</h4>
                                            <span style={{ fontSize: '0.85rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>🔥 Tổng: <strong>{totalCal} kcal</strong></span>
                                        </div>
                                        <div className="exercises-grid" style={{ padding: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                                            {dayExercises.map(ex => (
                                                <div className="exercise-card compact" style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' }} key={ex.id}>
                                                    <div style={{ fontSize: '2.5rem', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '12px', minWidth: '60px', textAlign: 'center' }}>{ex.emoji}</div>
                                                    <div>
                                                        <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#fff' }}>{ex.name}</h4>
                                                        <div className="exercise-details compact" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            <div className="detail-badge" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)' }}>Cơ: <span style={{ color: 'var(--color-primary)' }}>{ex.muscle_group}</span></div>
                                                            <div className="detail-badge" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)' }}>Lịch: <span style={{ color: 'var(--color-primary)' }}>{ex.recommended_sets_reps}</span></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                      </>
                                  );
                              })()}
                          </div>
                        </div>
                    ) : (
                        <div className="exercises-grid">
                        {(tempExercises[editActiveDay] || []).map(ex => (
                            <div className="exercise-card compact" style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', transition: 'transform 0.2s', overflow: 'hidden' }} key={ex.id}>
                            <button 
                                onClick={() => {
                                    const dayExercises = tempExercises[editActiveDay] || [];
                                    setTempExercises({ ...tempExercises, [editActiveDay]: dayExercises.filter(t => t.id !== ex.id) });
                                }}
                                style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(239, 68, 68, 0.15)', border: 'none', color: '#ef4444', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', zIndex: 2 }}
                                title="Xóa bài tập"
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                            >
                                ✕
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '4px' }}>
                                <div style={{ fontSize: '3rem', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '16px', minWidth: '80px', textAlign: 'center' }}>{ex.emoji}</div>
                                <div style={{ paddingRight: '40px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#fff' }}>{ex.name}</h4>
                                <div className="exercise-details compact" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <div className="detail-badge" style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }}>Cơ: <span style={{ color: 'var(--color-primary)' }}>{ex.muscle_group}</span></div>
                                    <div className="detail-badge" style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }}>Lịch: <span style={{ color: 'var(--color-primary)' }}>{ex.recommended_sets_reps}</span></div>
                                </div>
                                </div>
                            </div>
                            </div>
                        ))}
                        </div>
                    )}
                  </div>
                )}

                {/* Section 2: Chế độ dinh dưỡng */}
                {dashboardActiveTab === 'nutrition' && (
                  <div className="glass-card">
                    <h3 style={{ marginBottom: '16px' }}>🍳 Chế Độ Dinh Dưỡng</h3>
                    
                    <div className="nutrition-header">
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mục Tiêu Năng Lượng Đề Xuất</span>
                        <h2 style={{ fontSize: '2.5rem', color: 'var(--color-accent-emerald)', margin: '10px 0' }}>
                          {currentUser.aiOutput.targetCalories} <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>kcal/ngày</span>
                        </h2>
                      </div>
                      <div className="macros-wrapper" style={{ marginTop: 0 }}>
                        {Object.entries(currentUser.aiOutput.macros).map(([key, macro]) => (
                          <div className="macro-ring-box" key={key}>
                            <span className="macro-label" style={{ color: macro.color }}>
                              {key === 'protein' ? 'Protein' : key === 'carbs' ? 'Carbs' : 'Fat'}
                            </span>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{macro.grams}g</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="meal-plan-section">
                      <h4 style={{ marginBottom: '12px', fontSize: '1.1rem' }}>Thực Đơn Đề Xuất Trong Ngày</h4>
                      <div className="meals-list">
                        {currentUser.aiOutput.meals.map((meal, index) => (
                          <div className="meal-card" key={index}>
                            <span className="meal-tag">{meal.type}</span>
                            <h4 style={{ fontSize: '0.95rem' }}>{meal.name}</h4>
                            <div className="meal-calories" style={{ fontSize: '0.85rem' }}>~{meal.cal} kcal</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 3: Mobile App */}
                {dashboardActiveTab === 'mobile_app' && (
                  <div className="glass-card mobile-app-banner" style={{ marginTop: '0' }}>
                    <div style={{ padding: '16px' }}>
                      <h3 style={{ fontSize: '1.4rem' }}>Mobile App</h3>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        Yêu cầu tải xuống ứng dụng AuraFit để đồng bộ dữ liệu và nhận nhắc nhở tập luyện thông qua nền tảng di động.
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '16px' }}>
                        <a href="#android" className="app-badge-btn" onClick={(e) => { e.preventDefault(); alert('Redirecting to Google Play Store'); }}>
                          🤖 Android
                        </a>
                        <a href="#ios" className="app-badge-btn" onClick={(e) => { e.preventDefault(); alert('Redirecting to Apple App Store'); }}>
                          🍏 Apple iOS
                        </a>
                      </div>
                    </div>
                    <div className="qr-code-box">
                      <svg width="100" height="100" viewBox="0 0 100 100">
                        <path d="M 0,0 H 30 V 10 H 10 V 30 H 0 Z" fill="#000" />
                        <path d="M 70,0 H 100 V 30 H 90 V 10 H 70 Z" fill="#000" />
                        <path d="M 0,100 H 30 V 90 H 10 V 70 H 0 Z" fill="#000" />
                        <rect x="5" y="5" width="20" height="20" fill="none" stroke="#000" strokeWidth="4" />
                        <rect x="10" y="10" width="10" height="10" fill="#8B5CF6" />
                        <rect x="75" y="5" width="20" height="20" fill="none" stroke="#000" strokeWidth="4" />
                        <rect x="80" y="80" width="15" height="15" fill="#06B6D4" />
                        <rect x="35" y="15" width="5" height="10" fill="#000" />
                        <rect x="45" y="5" width="10" height="5" fill="#000" />
                        <rect x="40" y="25" width="15" height="5" fill="#000" />
                        <rect x="25" y="60" width="10" height="10" fill="#8B5CF6" />
                        <rect x="45" y="45" width="15" height="15" fill="#8B5CF6" />
                        <rect x="65" y="35" width="10" height="5" fill="#000" />
                        <rect x="50" y="85" width="15" height="5" fill="#000" />
                      </svg>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ==========================================================================
             5. SYSTEM EXERCISES LIST PAGE
             ========================================================================== */}
          {appState === 'exercise_list' && (
            <div style={{ marginTop: '30px', paddingBottom: '60px' }}>
              <h2 style={{ marginBottom: '8px' }}>Kho Bài Tập Hệ Thống</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Khám phá tất cả các bài tập được AuraFit AI hỗ trợ.</p>

              <div className="filter-bar">
                {['Tất cả', 'Ngực', 'Lưng & Xô', 'Đùi & Mông', 'Bụng', 'Tay trước', 'Tay sau', 'Vai', 'Toàn thân'].map(group => (
                  <button 
                    key={group}
                    className={`filter-btn ${muscleFilter === group ? 'active' : ''}`}
                    onClick={() => setMuscleFilter(group)}
                  >
                    {group}
                  </button>
                ))}
              </div>

              <div className="exercises-grid">
                {getFilteredExercises().map(ex => (
                  <div className="glass-card exercise-card" key={ex.id}>
                    <div className="exercise-img-placeholder">
                      {ex.emoji}
                      <span className="exercise-tag">{ex.difficulty}</span>
                    </div>
                    <h4>{ex.name}</h4>
                    <p style={{ fontSize: '0.85rem', height: '40px', overflow: 'hidden' }}>{ex.description}</p>
                    
                    <div className="exercise-details">
                      <div className="detail-badge">Cơ: <span>{ex.muscle_group}</span></div>
                      <div className="detail-badge">Dụng cụ: <span style={{textTransform: 'capitalize'}}>{ex.equipment}</span></div>
                    </div>
                  </div>
                ))}
                {getFilteredExercises().length === 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Không có bài tập nào thuộc nhóm cơ này.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* FOOTER */}
      {appState !== 'dashboard' && appState !== 'exercise_list' && (
        <footer className="app-footer">
          <div className="container footer-content">
            <p className="footer-text">
              © 2026 AuraFit AI Coach. Dự án giả lập Mock User Authentication & Navigation.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
