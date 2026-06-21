import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();

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
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  // Onboarding Wizard step
  const [wizardStep, setWizardStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState({
    name: '', dob: '01-01-2000', gender: 'Nam', height: 170, weight: 65, goal: 'build_muscle', equipment: 'dumbbell', experience: 'active'
  });

  // Filter state for exercise list
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountFormData, setAccountFormData] = useState({ name: '', dob: '', gender: 'Nam', height: 170, weight: 65, email: '', currentPassword: '', newPassword: '', confirmNewPassword: '' });
  const [accountActiveTab, setAccountActiveTab] = useState('profile');
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isOnboardingRetake, setIsOnboardingRetake] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
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
      setAuthError(t('t_49fe44a7'));
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setAuthError(t('t_487bd2e9'));
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
        setRegisterForm({ username: '', email: '', password: '', confirmPassword: '' });
        setAppState('activation_pending');
      } else {
        setAuthError(data.detail || 'Tên đăng nhập hoặc Email đã tồn tại.');
      }
    } catch (err) {
      setAuthError(t('t_49fe44a7'));
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
      alert(t('t_49fe44a7'));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setCurrentUser(null);
    setAppState('landing');
  };

  // URL parameters handling for Email links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const token = params.get('token');
    
    if (action === 'activate' && token) {
      handleActivateAccount(token);
    } else if (action === 'reset_password' && token) {
      setResetTokenForTest(token);
      setAppState('reset_password');
    }
    
    // Clear URL to avoid re-triggering
    if (action && token) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  

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
        setAppState('forgot_password_pending');
      } else {
        setAuthError(data.detail || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      setAuthError(t('t_49fe44a7'));
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (resetPassword !== resetConfirmPassword) {
      setAuthError(t('t_487bd2e9'));
      return;
    }
    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetTokenForTest, new_password: resetPassword })
      });
      const data = await res.json();
      if (res.ok) {
        alert(t('t_4065792b'));
        setAppState('login');
      } else {
        setAuthError(data.detail || 'Có lỗi xảy ra.');
      }
    } catch (err) {
      setAuthError(t('t_49fe44a7'));
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
        setIsOnboardingRetake(false);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Có lỗi xảy ra khi lưu hồ sơ: ${errData.detail || 'Vui lòng kiểm tra lại thông tin.'}`);
      }
    } catch (err) {
      alert(t('t_aa8ad644'));
    }
  };

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const renderWizardContent = () => (
    <div className="wizard-container glass-card" onClick={(e) => e.stopPropagation()} style={{ marginTop: isOnboardingRetake ? '0' : '50px', position: isOnboardingRetake ? 'relative' : 'static', width: isOnboardingRetake ? '100%' : 'auto', maxWidth: isOnboardingRetake ? '550px' : 'none', margin: isOnboardingRetake ? 'auto' : '50px auto', padding: '30px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>{t('t_641cf3e3')}</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem' }}>
        {isOnboardingRetake ? t('Cập nhật lại mục tiêu và thể trạng để AI tính toán lịch tập mới.') : t('Điền thông tin để thuật toán AI phân lớp và đề xuất chế độ tốt nhất dành riêng cho bạn.')}
      </p>

      <div className="wizard-progress">
        <div className="wizard-progress-bar"></div>
        {isOnboardingRetake ? (
          <>
            <div className="wizard-progress-fill" style={{ width: `${((wizardStep - 3) / 1) * 100}%` }}></div>
            <div className={`progress-step ${wizardStep >= 3 ? 'active' : ''} ${wizardStep > 3 ? 'completed' : ''}`}>1</div>
            <div className={`progress-step ${wizardStep >= 4 ? 'active' : ''}`}>2</div>
          </>
        ) : (
          <>
            <div className="wizard-progress-fill" style={{ width: `${((wizardStep - 1) / 3) * 100}%` }}></div>
            <div className={`progress-step ${wizardStep >= 1 ? 'active' : ''} ${wizardStep > 1 ? 'completed' : ''}`}>1</div>
            <div className={`progress-step ${wizardStep >= 2 ? 'active' : ''} ${wizardStep > 2 ? 'completed' : ''}`}>2</div>
            <div className={`progress-step ${wizardStep >= 3 ? 'active' : ''} ${wizardStep > 3 ? 'completed' : ''}`}>3</div>
            <div className={`progress-step ${wizardStep >= 4 ? 'active' : ''}`}>4</div>
          </>
        )}
      </div>

      <div>
        {wizardStep === 1 && !isOnboardingRetake && (
          <div className="step-content animate-slide-up">
            <h3 style={{ marginBottom: '20px' }}>{t('t_9bc667c8')}</h3>
            <div className="form-group">
              <label className="form-label">{t('t_ffe2e8d4')}</label>
              <input type="text" required className="form-input" value={onboardingData.name} onChange={(e) => setOnboardingData({ ...onboardingData, name: e.target.value })} />
            </div>
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">{t('t_b69d87d1')}</label>
                <input type="text" placeholder={t('t_b438afae')} required className="form-input" value={onboardingData.dob} onChange={(e) => setOnboardingData({ ...onboardingData, dob: e.target.value })} />
              </div>
              <div>
                <label className="form-label">{t('t_e02f0878')}</label>
                <select className="form-input" value={onboardingData.gender} onChange={(e) => setOnboardingData({ ...onboardingData, gender: e.target.value })}>
                  <option>{t('t_4ad35edf')}</option><option>{t('t_f406d100')}</option>
                </select>
              </div>
            </div>
          </div>
        )}
        {wizardStep === 2 && !isOnboardingRetake && (
          <div className="step-content animate-slide-up">
            <h3 style={{ marginBottom: '20px' }}>{t('t_35c78730')}</h3>
            <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">{t('t_cbc610cb')}</label>
                <input type="number" min="100" max="250" required className="form-input" value={onboardingData.height} onChange={(e) => setOnboardingData({ ...onboardingData, height: parseInt(e.target.value) || 170 })} />
              </div>
              <div>
                <label className="form-label">{t('t_6c9e1f48')}</label>
                <input type="number" min="30" max="200" required className="form-input" value={onboardingData.weight} onChange={(e) => setOnboardingData({ ...onboardingData, weight: parseInt(e.target.value) || 60 })} />
              </div>
            </div>
          </div>
        )}
        {wizardStep === 3 && (
          <div className="step-content animate-slide-up">
            <h3 style={{ marginBottom: '20px' }}>{isOnboardingRetake ? t('Bước 1') : t('Bước 3')}: {t('Chọn mục tiêu chính')}</h3>
            <div className="options-grid">
              <div className={`option-card ${onboardingData.goal === 'lose_weight' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, goal: 'lose_weight' })}>
                <span className="option-icon">🔥</span><span className="option-title">{t('t_37d2f642')}</span>
              </div>
              <div className={`option-card ${onboardingData.goal === 'build_muscle' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, goal: 'build_muscle' })}>
                <span className="option-icon">💪</span><span className="option-title">{t('t_89458a14')}</span>
              </div>
              <div className={`option-card ${onboardingData.goal === 'improve_endurance' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, goal: 'improve_endurance' })}>
                <span className="option-icon">🏃</span><span className="option-title">{t('t_1e940d47')}</span>
              </div>
              <div className={`option-card ${onboardingData.goal === 'stay_fit' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, goal: 'stay_fit' })}>
                <span className="option-icon">🧘</span><span className="option-title">{t('t_93ccb44b')}</span>
              </div>
            </div>
          </div>
        )}
        {wizardStep === 4 && (
          <div className="step-content animate-slide-up">
            <h3 style={{ marginBottom: '16px' }}>{isOnboardingRetake ? t('Bước 2') : t('Bước 4')}: {t('Thiết bị & Kinh nghiệm')}</h3>
            
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>{t('t_a397dd40')}</label>
            <div className="options-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
              <div className={`option-card ${onboardingData.equipment === 'none' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, equipment: 'none' })} style={{ padding: '8px 12px', gap: '6px' }}>
                <span className="option-icon" style={{ fontSize: '1.5rem' }}>🙌</span><span className="option-title" style={{ fontSize: '0.85rem' }}>{t('t_9a400b4c')}</span>
              </div>
              <div className={`option-card ${onboardingData.equipment === 'dumbbell' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, equipment: 'dumbbell' })} style={{ padding: '8px 12px', gap: '6px' }}>
                <span className="option-icon" style={{ fontSize: '1.5rem' }}>🏋️</span><span className="option-title" style={{ fontSize: '0.85rem' }}>{t('t_bbaceaf7')}</span>
              </div>
              <div className={`option-card ${onboardingData.equipment === 'barbell' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, equipment: 'barbell' })} style={{ padding: '8px 12px', gap: '6px' }}>
                <span className="option-icon" style={{ fontSize: '1.5rem' }}>🏋️‍♀️</span><span className="option-title" style={{ fontSize: '0.85rem' }}>{t('t_8e4e7d4d')}</span>
              </div>
              <div className={`option-card ${onboardingData.equipment === 'gym' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, equipment: 'gym' })} style={{ padding: '8px 12px', gap: '6px' }}>
                <span className="option-icon" style={{ fontSize: '1.5rem' }}>🏢</span><span className="option-title" style={{ fontSize: '0.85rem' }}>{t('t_c6e40fd1')}</span>
              </div>
            </div>

            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>{t('t_ef545456')}</label>
            <div className="options-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div className={`option-card ${onboardingData.experience === 'sedentary' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, experience: 'sedentary' })} style={{ padding: '8px 12px', flexDirection: 'column', gap: '4px' }}>
                <span className="option-icon" style={{ fontSize: '1.5rem' }}>💻</span><span className="option-title" style={{ fontSize: '0.8rem' }}>{t('t_ed318449')}</span>
              </div>
              <div className={`option-card ${onboardingData.experience === 'active' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, experience: 'active' })} style={{ padding: '8px 12px', flexDirection: 'column', gap: '4px' }}>
                <span className="option-icon" style={{ fontSize: '1.5rem' }}>🏃</span><span className="option-title" style={{ fontSize: '0.8rem' }}>{t('t_b3ae93fe')}</span>
              </div>
              <div className={`option-card ${onboardingData.experience === 'athletic' ? 'selected' : ''}`} onClick={() => setOnboardingData({ ...onboardingData, experience: 'athletic' })} style={{ padding: '8px 12px', flexDirection: 'column', gap: '4px' }}>
                <span className="option-icon" style={{ fontSize: '1.5rem' }}>🏅</span><span className="option-title" style={{ fontSize: '0.8rem' }}>{t('t_b52798e8')}</span>
              </div>
            </div>
          </div>
        )}

        <div className="wizard-actions" style={{ display: 'flex' }}>
          {wizardStep > (isOnboardingRetake ? 3 : 1) && (
            <button type="button" className="btn-secondary" onClick={() => setWizardStep(wizardStep - 1)}>{t('Quay Lại')}</button>
          )}
          {isOnboardingRetake && wizardStep === 3 && (
            <button type="button" className="btn-secondary" onClick={() => setIsOnboardingRetake(false)}>{t('Hủy Bỏ')}</button>
          )}
          <div style={{ flex: 1 }}></div>
          {wizardStep < 4 ? (
            <button type="button" className="btn-primary" onClick={(e) => { e.preventDefault(); setWizardStep(wizardStep + 1); }}>{t('Tiếp Tục ➜')}</button>
          ) : (
            <button type="button" className="btn-primary" onClick={handleOnboardingSubmit}>{t('t_08004904')}</button>
          )}
        </div>
      </div>
    </div>
  );

  const renderHeader = () => {
    if (!currentUser || currentUser.isAdmin) return null; // Don't show full header for non-logged in or Admin

    return (
      <header className="app-header">
        <div className="container nav-container">
          <div className="logo-group" onClick={() => setAppState('landing')}>
            <span className="logo-icon">⚡</span>
            <span className="logo-text">{t('t_0fa8c7e7')}</span>
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
              {t("List bài tập hệ thống")}
            </button>
            
            {/* User Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', marginRight: '16px' }}>
              <select className="btn-secondary" style={{ padding: '4px 8px', borderRadius: '8px', cursor: 'pointer', outline: 'none' }} value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
                <option value="vi">🇻🇳 Tiếng Việt</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>
            
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
                  <div className="dropdown-item static">👤 {currentUser.userData?.name || currentUser.username}</div>
                  <button 
                    className="dropdown-item"
                    onClick={() => {
                      if (currentUser && currentUser.userData) {
                        setAccountFormData({
                          name: currentUser.userData.name,
                          dob: currentUser.userData.dob,
                          gender: currentUser.userData.gender,
                          height: currentUser.userData.height,
                          weight: currentUser.userData.weight,
                          email: currentUser.email,
                          currentPassword: '',
                          newPassword: ''
                        });
                        setAccountActiveTab('profile');
                        setIsAccountModalOpen(true);
                      }
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
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white', fontSize: '1.2rem' }}>{t('t_8b99a75e')}</div>;
  }

  if (appState.startsWith('admin_')) {
    return (
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">{t('t_68483242')}</span>
          </div>
          <nav className="admin-nav">
            <button 
              className={`admin-nav-item ${appState === 'admin_users' ? 'active' : ''}`}
              onClick={() => setAppState('admin_users')}
            >
              👤 {t("Quản lý Users")}
            </button>
            <button 
              className={`admin-nav-item ${appState === 'admin_exercises' ? 'active' : ''}`}
              onClick={() => setAppState('admin_exercises')}
            >
              🏋️ {t("Quản lý Bài Tập")}
            </button>
          </nav>
        </aside>

        <main className="admin-main">
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '24px', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {(currentUser?.userData?.name || currentUser?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{t('t_4e189a34')} <span style={{ color: 'var(--color-primary)' }}>{currentUser?.userData?.name || currentUser?.username}</span>!</span>
            </div>
            <button 
              className="btn-secondary" 
              onClick={handleLogout} 
              style={{ padding: '6px 14px', fontSize: '0.85rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
            >
              {t('t_a07e9625')}
            </button>
          </div>

          {appState === 'admin_users' && (
            <div>
              <div className="admin-header">
                <h2>{t('t_b19ee73c')}</h2>
              </div>

              <div className="glass-card" style={{ marginBottom: '32px', padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>{t('t_4d0826f2')}</h3>
                <div className="admin-form-row">
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('t_304344b7')}</label>
                    <input type="text" className="form-input" placeholder={t('t_304344b7')} value={adminNewUser.username} onChange={e => setAdminNewUser({...adminNewUser, username: e.target.value})} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('t_ce8ae9da')}</label>
                    <input type="email" className="form-input" placeholder={t('t_ce8ae9da')} value={adminNewUser.email} onChange={e => setAdminNewUser({...adminNewUser, email: e.target.value})} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('t_3a66486f')}</label>
                    <input type="password" className="form-input" placeholder={t('t_3a66486f')} value={adminNewUser.password} onChange={e => setAdminNewUser({...adminNewUser, password: e.target.value})} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('t_eb643df2')}</label>
                    <input type="password" className="form-input" placeholder={t('t_eb643df2')} value={adminNewUser.confirmPassword} onChange={e => setAdminNewUser({...adminNewUser, confirmPassword: e.target.value})} />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('t_55b2405c')}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 0', height: '100%', minHeight: '48px' }}>
                      <input type="checkbox" id="isAdminCheck" checked={adminNewUser.is_admin} onChange={e => setAdminNewUser({...adminNewUser, is_admin: e.target.checked})} />
                      <label htmlFor="isAdminCheck" style={{ cursor: 'pointer', userSelect: 'none' }}>{t('t_9c24893b')}</label>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'transparent', userSelect: 'none' }}>{t('t_71d52075')}</label>
                    <button 
                      className="btn-primary"
                      style={{ padding: '14px 28px' }}
                      onClick={async () => {
                        if (!adminNewUser.username || !adminNewUser.email || !adminNewUser.password) return alert(t('t_b3605297'));
                        if (adminNewUser.password !== adminNewUser.confirmPassword) return alert(t('t_d97055aa'));
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
                        } catch (err) { alert(t('t_d3880593')); }
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
                      <th>{t('t_b718adec')}</th>
                      <th>{t('t_f6039d44')}</th>
                      <th>{t('t_ce8ae9da')}</th>
                      <th>{t('t_0e071cd1')}</th>
                      <th>{t('t_0fbc27f5')}</th>
                      <th>{t('t_1737d210')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersDb.map(u => (
                      <tr key={u.id}>
                        <td>#{u.id}</td>
                        <td style={{ fontWeight: 'bold' }}>{u.username}</td>
                        <td>{u.email}</td>
                        <td>
                          {u.is_admin ? <span className="status-badge" style={{ background: '#9c27b0' }}>{t('t_e3afed00')}</span> : <span className="status-badge">{t('t_8f9bfe9d')}</span>}
                        </td>
                        <td>
                          {u.has_profile || u.is_admin ? (
                            <span className="status-badge success">{t('t_c6de124c')}</span>
                          ) : (
                            <span className="status-badge warning">{u.is_active ? t('Chưa cập nhật') : t('Chưa kích hoạt')}</span>
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
                              } catch (err) { alert(t('t_aaf377aa')) }
                            }}
                          >
                            {u.is_admin ? t('Hạ quyền') : t('Cấp Admin')}
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
                                } catch (err) { alert(t('t_ae787bd4')) }
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
                <h2>{t('t_c3a8d3fd')}</h2>
              </div>
              
              <div className="glass-card" style={{ marginBottom: '32px', padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>{t('t_58d062be')}</h3>
                <div className="admin-form-row">
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('t_38a92b65')}</label>
                    <input type="text" className="form-input" placeholder={t('t_77821232')} value={adminNewExercise.name} onChange={e => setAdminNewExercise({...adminNewExercise, name: e.target.value})} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('t_9389e8d7')}</label>
                    <select className="form-input" value={adminNewExercise.muscle_group} onChange={e => setAdminNewExercise({...adminNewExercise, muscle_group: e.target.value})}>
                      <option>{t('t_bb4e7837')}</option><option>{t('t_4b45ef38')}</option><option>{t('t_ffe3ce42')}</option><option>{t('t_682a1b4c')}</option><option>{t('t_36da9362')}</option><option>{t('t_b776bced')}</option><option>{t('t_daf357a2')}</option><option>{t('t_093dc017')}</option><option>{t('t_f16b620f')}</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('t_e1f1c821')}</label>
                    <select className="form-input" value={adminNewExercise.difficulty} onChange={e => setAdminNewExercise({...adminNewExercise, difficulty: e.target.value})}>
                      <option value="beginner">{t('t_16e152a2')}</option><option value="intermediate">{t('t_e4455e80')}</option><option value="advanced">{t('t_7f6318b8')}</option>
                    </select>
                  </div>
                </div>
                <div className="admin-form-row">
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('t_07123c29')}</label>
                    <select className="form-input" value={adminNewExercise.equipment} onChange={e => setAdminNewExercise({...adminNewExercise, equipment: e.target.value})}>
                      <option value="none">{t('t_9a400b4c')}</option>
                      <option value="dumbbell">{t('t_bbaceaf7')}</option>
                      <option value="barbell">{t('t_8e4e7d4d')}</option>
                      <option value="machine">{t('t_e6f92575')}</option>
                      <option value="cable">{t('t_c7fc6ff6')}</option>
                      <option value="gym">{t('t_f3c9c65c')}</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('t_6cc7088e')}</label>
                    <input type="text" className="form-input" placeholder={t('t_f7e4bb5b')} value={adminNewExercise.recommended_sets_reps} onChange={e => setAdminNewExercise({...adminNewExercise, recommended_sets_reps: e.target.value})} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('t_30fc3f1e')}</label>
                    <input type="number" className="form-input" placeholder={t('t_5111b4a4')} value={adminNewExercise.calories_estimated} onChange={e => setAdminNewExercise({...adminNewExercise, calories_estimated: parseInt(e.target.value) || 0})} />
                  </div>
                </div>
                <div className="admin-form-row" style={{ alignItems: 'center' }}>
                  <input type="text" className="form-input" style={{ flex: 3 }} placeholder={t('t_e9c02d54')} value={adminNewExercise.description} onChange={e => setAdminNewExercise({...adminNewExercise, description: e.target.value})} />
                  <select 
                    className="form-input" 
                    style={{ flex: 1 }} 
                    value={adminNewExercise.emoji} 
                    onChange={e => setAdminNewExercise({...adminNewExercise, emoji: e.target.value})}
                  >
                    <option value="💪">{t('t_f7e9e1e7')}</option>
                    <option value="🏋️">{t('t_721965ae')}</option>
                    <option value="🏃">{t('t_3f64b565')}</option>
                    <option value="🚴">{t('t_74370f9b')}</option>
                    <option value="🤸">{t('t_0b5c1f0c')}</option>
                    <option value="🪢">{t('t_09c62aad')}</option>
                    <option value="🦵">{t('t_c88bf588')}</option>
                    <option value="🧘‍♀️">{t('t_c7422728')}</option>
                    <option value="🦾">{t('t_00dd3f6b')}</option>
                    <option value="🔥">{t('t_95863de3')}</option>
                    <option value="❤️">{t('t_ac41123d')}</option>
                    <option value="🧗">{t('t_638a484d')}</option>
                    <option value="🏊">{t('t_7f7a5339')}</option>
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
                        } else { alert(t('t_d6cbd083')); }
                      } catch (err) { alert(t('t_d3880593')); }
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
                  <span style={{ fontWeight: 600 }}>{t('t_a341ba7d')}</span>
                  <select 
                    className="form-input" 
                    style={{ width: '200px' }} 
                    value={adminExerciseFilter} 
                    onChange={e => setAdminExerciseFilter(e.target.value)}
                  >
                    <option value="Tất cả">{t('t_d8586d08')}</option>
                    <option value="Ngực">{t('t_bb4e7837')}</option>
                    <option value="Lưng & Xô">{t('t_4b45ef38')}</option>
                    <option value="Đùi & Mông">{t('t_ffe3ce42')}</option>
                    <option value="Bụng">{t('t_682a1b4c')}</option>
                    <option value="Tay trước">{t('t_36da9362')}</option>
                    <option value="Tay sau">{t('t_b776bced')}</option>
                    <option value="Vai">{t('t_daf357a2')}</option>
                    <option value="Toàn thân">{t('t_093dc017')}</option>
                    <option value="Cardio">{t('t_f16b620f')}</option>
                  </select>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('t_465ab550')}</th>
                      <th>{t('t_cc2f10b7')}</th>
                      <th>{t('t_e7a8d487')}</th>
                      <th>{t('t_07123c29')}</th>
                      <th>{t('t_0b9dedd1')}</th>
                      <th>{t('t_2823c946')}</th>
                      <th>{t('t_1737d210')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(adminExerciseFilter === 'Tất cả' ? exercisesDb : exercisesDb.filter(ex => ex.muscle_group === adminExerciseFilter)).map(ex => (
                      <tr key={ex.id}>
                        <td style={{ fontWeight: 'bold' }}>{ex.emoji} {t(ex.name)}</td>
                        <td>{t(ex.muscle_group)}</td>
                        <td><span className="status-badge" style={{ background: 'rgba(255,255,255,0.1)' }}>{ex.difficulty}</span></td>
                        <td>{ex.equipment}</td>
                        <td style={{ color: 'var(--color-primary)' }}>{ex.recommended_sets_reps?.replace("hiệp", t("hiệp"))?.replace("lần", t("lần"))}</td>
                        <td style={{ color: 'var(--color-accent-emerald)', fontWeight: 'bold' }}>{ex.calories_estimated} kcal</td>
                        <td>
                          <button 
                            className="action-btn"
                            style={{ marginRight: '8px' }}
                            onClick={() => {
                              setEditingExerciseId(ex.id);
                              setAdminNewExercise({
                                name: ex.name, muscle_group: ex.muscle_group, difficulty: ex.difficulty, equipment: ex.equipment,
                                calories_estimated: ex.calories_estimated, recommended_sets_reps: ex.recommended_sets_reps?.replace("hiệp", t("hiệp"))?.replace("lần", t("lần")),
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
                                  else alert(t('t_9036fab7'));
                                } catch (err) { alert(t('t_d3880593')); }
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
              <div className="hero-badge">{t('t_00dbddb5')}</div>
              <h1>{t('t_8d520948')}</h1>
              <p className="hero-subtitle">
                {t('t_dde3b9f5')}
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
                <h2>{t('t_f3b2e129')}</h2>
                <p>{t('t_c605992d')}</p>
                <form onSubmit={handleLogin}>
                  <div className="form-group">
                    <label className="form-label">{t('t_a3015024')}</label>
                    <input 
                      type="text" 
                      required 
                      className="form-input" 
                      value={loginForm.identifier}
                      onChange={(e) => setLoginForm({...loginForm, identifier: e.target.value})}
                      placeholder={t('t_40c76c26')}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('t_3a66486f')}</label>
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

                  <button type="submit" className="btn-primary full-width">{t('t_f3b2e129')}</button>
                </form>
                
                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {t('t_66768b62')} <span className="text-link" onClick={() => setAppState('register')}>Đăng ký</span>
                </div>
              </div>
            </div>
          )}
          {appState === 'activation_pending' && (
            <div className="auth-container">
              <div className="glass-card auth-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✉️</div>
                <h2 style={{ color: 'var(--color-primary)' }}>{t('t_0bf32da9')}</h2>
                <p>{t('t_fe597b5b')}</p>
                
                {activationTokenForTest && (
                  <div style={{ marginTop: '32px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px dashed var(--color-primary)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      {t('t_aa5df52e')}
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
                  <button className="btn-secondary" onClick={() => setAppState('login')}>{t('Quay về Đăng nhập')}</button>
                </div>
              </div>
            </div>
          )}

          {appState === 'forgot_password' && (
            <div className="auth-container">
              <div className="glass-card auth-card">
                <h2>{t('t_2e9fc391')}</h2>
                <p>{t('t_0f6aa3d4')}</p>
                <form onSubmit={handleForgotPassword}>
                  <div className="form-group">
                    <label className="form-label">{t('t_ce8ae9da')}</label>
                    <input type="email" required className="form-input" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder={t('t_fcbcdbaa')} />
                  </div>
                  {authError && <div className="form-error">{authError}</div>}
                  <button type="submit" className="btn-primary full-width" style={{ marginTop: '16px' }}>{t('t_33ba09af')}</button>
                </form>
                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem' }}>
                  <span className="text-link" onClick={() => setAppState('login')}>{t('Quay về đăng nhập')}</span>
                </div>
              </div>
            </div>
          )}

          {appState === 'forgot_password_pending' && (
            <div className="auth-container">
              <div className="glass-card auth-card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✉️</div>
                <h2 style={{ color: 'var(--color-primary)' }}>{t('t_0bf32da9')}</h2>
                <p>{t('t_3fe5db06')}</p>
                
                {resetTokenForTest && (
                  <div style={{ marginTop: '32px', padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px dashed var(--color-primary)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      {t('t_aa5df52e')}
                    </p>
                    <button className="btn-primary" onClick={() => setAppState('reset_password')}>{t('Mở form Đặt Lại Mật Khẩu')}</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {appState === 'reset_password' && (
            <div className="auth-container">
              <div className="glass-card auth-card">
                <h2>{t('t_2896d317')}</h2>
                <p>{t('t_0a39242f')}</p>
                <form onSubmit={handleResetPassword}>
                  <div className="form-group">
                    <label className="form-label">{t('t_ccef959a')}</label>
                    <input type="password" required className="form-input" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('t_493827ca')}</label>
                    <input type="password" required className="form-input" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  {authError && <div className="form-error">{authError}</div>}
                  <button type="submit" className="btn-primary full-width" style={{ marginTop: '16px' }}>{t('t_92512111')}</button>
                </form>
              </div>
            </div>
          )}

          {appState === 'register' && (
            <div className="auth-container">
              <div className="glass-card auth-card">
                <h2>{t('t_4a0a2d6b')}</h2>
                <p>{t('t_48bec2c7')}</p>
                <form onSubmit={handleRegister}>
                  <div className="form-group">
                    <label className="form-label">{t('t_3078767d')}</label>
                    <input 
                      type="text" 
                      required 
                      className="form-input" 
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('t_ce8ae9da')}</label>
                    <input 
                      type="email" 
                      required 
                      className="form-input" 
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('t_3a66486f')}</label>
                    <input 
                      type="password" 
                      required 
                      className="form-input" 
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('t_eb643df2')}</label>
                    <input 
                      type="password" 
                      required 
                      className="form-input" 
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                    />
                  </div>
                  
                  {authError && <div className="form-error" style={{ marginBottom: '16px' }}>{authError}</div>}
                  
                  <button type="submit" className="btn-primary full-width">{t('t_8f9068f3')}</button>
                </form>
                
                <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {t('t_27d2c72f')} <span className="text-link" onClick={() => setAppState('login')}>Đăng nhập</span>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================================================
             3. ONBOARDING WIZARD
             ========================================================================== */}
          {appState === 'onboarding' && !isOnboardingRetake && (
            renderWizardContent()
          )}

          {/* ==========================================================================
             4. DASHBOARD PAGE (NEW LAYOUT)
             ========================================================================== */}
          {appState === 'dashboard' && currentUser?.aiOutput && (
            <div className="dashboard-layout">
              {/* LEFT SIDEBAR: Personal Stats */}
              <aside className="dashboard-sidebar">
                <div className="glass-card profile-card">
                  <input type="file" id="avatarUpload" style={{ display: 'none' }} accept="image/*" onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    // Giới hạn 5MB
                    if (file.size > 5 * 1024 * 1024) {
                      alert(t('t_5ae07b8d'));
                      e.target.value = '';
                      return;
                    }
                    
                    // Tạo preview
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setAvatarPreview(reader.result);
                      setAvatarFile(file);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }} />
                  
                  {/* Avatar Preview Modal */}
                  {avatarPreview && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setAvatarPreview(null); setAvatarFile(null); }}>
                      <div className="glass-card animate-slide-up" style={{ padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '16px' }}>{t('t_ac6f25a3')}</h3>
                        <div style={{ width: '180px', height: '180px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 20px', border: '3px solid var(--color-primary)', boxShadow: '0 0 25px rgba(14,165,233,0.4)' }}>
                          <img src={avatarPreview} alt={t('t_31fde7b0')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>
                          {avatarFile && `${avatarFile.name} (${(avatarFile.size / 1024 / 1024).toFixed(2)} MB)`}
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setAvatarPreview(null); setAvatarFile(null); }}>{t('Hủy')}</button>
                          <button className="btn-primary" style={{ flex: 1 }} disabled={isUploadingAvatar} onClick={async () => {
                            if (!avatarFile) return;
                            setIsUploadingAvatar(true);
                            const formData = new FormData();
                            formData.append('file', avatarFile);
                            try {
                              const res = await fetch(`${API_URL}/profile/avatar/upload`, {
                                method: 'POST',
                                headers: getAuthHeaders(),
                                body: formData
                              });
                              if (res.ok) {
                                const data = await res.json();
                                const updated = { ...currentUser };
                                updated.userData.avatar_url = data.avatar_url;
                                setCurrentUser(updated);
                              } else { alert(t('t_d4feeac0')); }
                            } catch (err) { alert(t('t_d3880593')); }
                            setIsUploadingAvatar(false);
                            setAvatarPreview(null);
                            setAvatarFile(null);
                          }}>{isUploadingAvatar ? t('Đang tải...') : t('Xác nhận')}</button>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="avatar-glow" onClick={() => {
                      document.getElementById('avatarUpload').click();
                  }} style={{ cursor: 'pointer', backgroundImage: currentUser.userData.avatar_url ? `url(${currentUser.userData.avatar_url})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', color: currentUser.userData.avatar_url ? 'transparent' : 'inherit' }} title={t('t_773e0c7c')}>
                    {currentUser.userData.avatar_url ? '' : (currentUser.userData.gender === 'Nam' ? '🧔' : '👩')}
                  </div>
                  <h3 style={{ marginTop: '12px' }}>{currentUser.userData?.name || currentUser.username}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>{currentUser.email}</p>
                  <button className="btn-secondary" style={{ width: '100%', marginBottom: '16px', padding: '6px', fontSize: '0.9rem' }} onClick={() => {
                    setAccountFormData({
                          name: currentUser.userData.name,
                          dob: currentUser.userData.dob,
                          gender: currentUser.userData.gender,
                          height: currentUser.userData.height,
                          weight: currentUser.userData.weight,
                          email: currentUser.email,
                          currentPassword: '',
                          newPassword: ''
                        });
                        setAccountActiveTab('profile');
                        setIsAccountModalOpen(true);
                  }}>⚙️ {t("Cập nhật thông tin")}</button>

                  <div className="stats-grid" style={{ gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="stat-label">{t('t_1404abca')}</span>
                      <span className="stat-value" style={{ fontSize: '0.9rem' }}>{currentUser.userData.dob}</span>
                    </div>
                    <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="stat-label">{t('t_33ac8b54')}</span>
                      <span className="stat-value" style={{ fontSize: '0.9rem' }}>{t(currentUser.userData.gender)}</span>
                    </div>
                    <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="stat-label">{t('t_b0394260')}</span>
                      <span className="stat-value" style={{ fontSize: '0.9rem' }}>{currentUser.userData.height} cm</span>
                    </div>
                    <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="stat-label">{t('t_e2ff8d60')}</span>
                      <span className="stat-value" style={{ fontSize: '0.9rem' }}>{currentUser.userData.weight} kg</span>
                    </div>
                    <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="stat-label">{t('t_eebd73b0')}</span>
                      <div style={{ textAlign: 'right' }}>
                        <span className="stat-value stat-highlight" style={{ fontSize: '1.1rem' }}>{currentUser.aiOutput.bmi}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t(currentUser.aiOutput.bmiStatus)}</div>
                      </div>
                    </div>
                    <div className="stat-item" style={{ marginTop: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 12px', borderRadius: '12px', textAlign: 'center' }}>
                      <div className="stat-label" style={{ marginBottom: '8px' }}>{t('t_e39aae01')}</div>
                      <div className="stat-value" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-primary)' }}>
                        <span>🎯</span> {t(currentUser.aiOutput.goalLabel)}
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              {/* MAIN CONTENT AREA */}
              <section className="dashboard-main">
                <div className="dashboard-header-flex">
                  <h2>{t('t_f40e5160')}</h2>
                  <button 
                    className="btn-secondary" 
                    onClick={() => {
                      setOnboardingData(currentUser.userData);
                      setWizardStep(3);
                      setIsOnboardingRetake(true);
                    }}
                  >
                    {t("Khảo sát lại mục tiêu 🔄")}
                  </button>
                </div>

                <div className="section-tabs">
                  <button 
                    className={`tab-link ${dashboardActiveTab === 'workouts' ? 'active' : ''}`}
                    onClick={() => setDashboardActiveTab('workouts')}
                  >
                    🏋️ {t("Lịch Tập Đề Xuất")}
                  </button>
                  <button 
                    className={`tab-link ${dashboardActiveTab === 'nutrition' ? 'active' : ''}`}
                    onClick={() => setDashboardActiveTab('nutrition')}
                  >
                    🍳 {t("Chế Độ Dinh Dưỡng")}
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
                      <h3>{t('t_b71d0d27')}</h3>
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
                                  } else { alert(t('t_d6cbd083')); }
                              }).catch(() => alert(t('t_d3880593')));
                          } else {
                              setTempExercises(currentUser.aiOutput.recommendedExercises);
                              setIsEditingExercises(true);
                          }
                      }}>
                          {isEditingExercises ? t('Lưu Thay Đổi') : t('Chỉnh Sửa')}
                      </button>
                    </div>

                    {isEditingExercises && (
                      <div style={{ marginBottom: '20px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <p style={{ fontSize: '0.95rem', margin: 0 }}>{t('t_66ea9cc6')}</p>
                            <span style={{ fontSize: '0.85rem', background: 'var(--color-primary)', padding: '4px 10px', borderRadius: '20px', color: '#fff', fontWeight: 'bold' }}>{t("Đã chọn:")} {tempExercises[editActiveDay]?.length || 0} {t("bài")}</span>
                          </div>
                          
                          {/* Day Selector Tabs */}
                          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'].map(day => (
                                <button key={t(day)} onClick={() => setEditActiveDay(day)} style={{ padding: '6px 14px', fontSize: '0.85rem', border: 'none', background: editActiveDay === day ? 'var(--color-primary)' : 'transparent', color: editActiveDay === day ? '#fff' : 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: '8px 8px 0 0', fontWeight: editActiveDay === day ? 'bold' : 'normal', transition: 'all 0.2s' }}>
                                    {t(day)} {tempExercises[day]?.length > 0 && `(${tempExercises[day].length})`}
                                </button>
                            ))}
                          </div>

                          <div className="custom-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '12px' }}>
                            {['Tất cả', 'Cardio', 'Ngực', 'Lưng & Xô', 'Bụng', 'Vai', 'Đùi & Mông', 'Tay trước', 'Tay sau', 'Toàn thân'].map(muscle => (
                                <button key={muscle} onClick={() => setEditMuscleFilter(muscle)} style={{ padding: '6px 14px', fontSize: '0.85rem', borderRadius: '20px', border: editMuscleFilter === muscle ? '1px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.1)', background: editMuscleFilter === muscle ? 'rgba(56, 189, 248, 0.15)' : 'transparent', color: editMuscleFilter === muscle ? 'var(--color-primary)' : 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                                    {muscle}
                                </button>
                            ))}
                          </div>

                          <div className="custom-scrollbar" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', maxHeight: '380px', overflowY: 'auto', paddingRight: '8px' }}>
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
                                          <div style={{ fontSize: '0.85rem', lineHeight: '1.3', fontWeight: isSelected ? '600' : 'normal', color: isSelected ? '#fff' : 'var(--text-main)' }}>{t(ex.name)}</div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        {isEditingExercises ? `${t("Danh sách bài tập ngày ")}${editActiveDay}:` : t("Lịch tập theo ngày trong tuần:")}
                      </p>
                      {isEditingExercises && (
                        <div className="detail-badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', fontSize: '0.85rem' }}>
                          🔥 {t("Ước tính")} ({editActiveDay}): <strong>{(tempExercises[editActiveDay] || []).reduce((sum, ex) => sum + (ex.calories_estimated || 0), 0)} kcal</strong>
                        </div>
                      )}
                    </div>

                    {!isEditingExercises ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', className: 'custom-scrollbar' }}>
                            {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'].map(day => {
                                const hasExercises = currentUser.aiOutput.recommendedExercises[day]?.length > 0;
                                return (
                                <button key={t(day)} onClick={() => setViewActiveDay(day)} style={{ padding: '6px 14px', fontSize: '0.85rem', border: '1px solid var(--border-glass)', background: viewActiveDay === day ? 'rgba(255,255,255,0.1)' : 'transparent', color: viewActiveDay === day ? '#fff' : 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: '20px', fontWeight: viewActiveDay === day ? 'bold' : 'normal', transition: 'all 0.2s', position: 'relative' }}>
                                    {t(day)}
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
                                              <h4 style={{ color: 'var(--text-muted)', margin: 0, fontSize: '1.1rem' }}>{t('t_f949b26f')}</h4>
                                          </div>
                                      );
                                  }

                                  return (
                                      <>
                                        <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>{t("Giáo án ")} {viewActiveDay}</h4>
                                            <span style={{ fontSize: '0.85rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{t('t_118a30a8')} <strong>{totalCal} kcal</strong></span>
                                        </div>
                                        <div className="exercises-grid custom-scrollbar" style={{ padding: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                                            {dayExercises.map(ex => (
                                                <div className="exercise-card compact" style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px' }} key={ex.id}>
                                                    <div style={{ fontSize: '2.5rem', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '12px', minWidth: '60px', textAlign: 'center' }}>{ex.emoji}</div>
                                                    <div>
                                                        <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#fff' }}>{t(ex.name)}</h4>
                                                        <div className="exercise-details compact" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            <div className="detail-badge" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)' }}>{t('t_4b4957ba')} <span style={{ color: 'var(--color-primary)' }}>{t(ex.muscle_group)}</span></div>
                                                            <div className="detail-badge" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)' }}>{t('t_39b4dd4c')} <span style={{ color: 'var(--color-primary)' }}>{ex.recommended_sets_reps?.replace("hiệp", t("hiệp"))?.replace("lần", t("lần"))}</span></div>
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
                        <div className="exercises-grid custom-scrollbar">
                        {(tempExercises[editActiveDay] || []).map(ex => (
                            <div className="exercise-card compact" style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', transition: 'transform 0.2s', overflow: 'hidden' }} key={ex.id}>
                            <button 
                                onClick={() => {
                                    const dayExercises = tempExercises[editActiveDay] || [];
                                    setTempExercises({ ...tempExercises, [editActiveDay]: dayExercises.filter(t => t.id !== ex.id) });
                                }}
                                style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(239, 68, 68, 0.15)', border: 'none', color: '#ef4444', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', zIndex: 2 }}
                                title={t('t_f4e3a15b')}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                            >
                                ✕
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '4px' }}>
                                <div style={{ fontSize: '3rem', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '16px', minWidth: '80px', textAlign: 'center' }}>{ex.emoji}</div>
                                <div style={{ paddingRight: '40px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#fff' }}>{t(ex.name)}</h4>
                                <div className="exercise-details compact" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <div className="detail-badge" style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }}>{t('t_4b4957ba')} <span style={{ color: 'var(--color-primary)' }}>{t(ex.muscle_group)}</span></div>
                                    <div className="detail-badge" style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)' }}>{t('t_39b4dd4c')} <span style={{ color: 'var(--color-primary)' }}>{ex.recommended_sets_reps?.replace("hiệp", t("hiệp"))?.replace("lần", t("lần"))}</span></div>
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
                    <h3 style={{ marginBottom: '16px' }}>{t('t_d8a8e28b')}</h3>
                    
                    <div className="nutrition-header">
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('t_711cd7d3')}</span>
                        <h2 style={{ fontSize: '2.5rem', color: 'var(--color-accent-emerald)', margin: '10px 0' }}>
                          {currentUser.aiOutput.targetCalories} <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{t('t_f1d9d448')}</span>
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
                      <h4 style={{ marginBottom: '12px', fontSize: '1.1rem' }}>{t('t_af03447b')}</h4>
                      <div className="meals-list">
                        {currentUser.aiOutput.meals.map((meal, index) => (
                          <div className="meal-card" key={index}>
                            <span className="meal-tag">{t(meal.type)}</span>
                            <h4 style={{ fontSize: '0.95rem' }}>{t(meal.name)}</h4>
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
                      <h3 style={{ fontSize: '1.4rem' }}>{t('t_63fa7c36')}</h3>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        {t('t_c8357b69')}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '16px' }}>
                        <a href="#android" className="app-badge-btn" onClick={(e) => { e.preventDefault(); alert(t('t_6108e3aa')); }}>
                          🤖 Android
                        </a>
                        <a href="#ios" className="app-badge-btn" onClick={(e) => { e.preventDefault(); alert(t('t_739d6410')); }}>
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

          {isOnboardingRetake && (
            <div className="modal-overlay" onClick={() => setIsOnboardingRetake(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
              {renderWizardContent()}
            </div>
          )}
          
          {isAccountModalOpen && (
            <div className="modal-overlay" onClick={() => setIsAccountModalOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
              <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px', background: 'var(--bg-glass)', position: 'relative' }}>
                <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>{t('t_976d3aa4')}</h2>
                
                <div className="section-tabs" style={{ marginBottom: '20px' }}>
                  <button className={`tab-link ${accountActiveTab === 'profile' ? 'active' : ''}`} onClick={() => setAccountActiveTab('profile')}>👤 {t("Thông tin cá nhân")}</button>
                  <button className={`tab-link ${accountActiveTab === 'security' ? 'active' : ''}`} onClick={() => setAccountActiveTab('security')}>🔒 {t("Bảo mật")}</button>
                </div>

                {accountActiveTab === 'profile' && (
                  <div className="animate-slide-up">
                    <div className="form-group">
                      <label className="form-label">{t('t_6cccad8f')}</label>
                      <input type="text" className="form-input" value={accountFormData.name} onChange={e => setAccountFormData({ ...accountFormData, name: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label className="form-label">{t('t_b69d87d1')}</label>
                        <input type="text" className="form-input" value={accountFormData.dob} onChange={e => setAccountFormData({ ...accountFormData, dob: e.target.value })} />
                      </div>
                      <div>
                        <label className="form-label">{t('t_e02f0878')}</label>
                        <select className="form-input" value={accountFormData.gender} onChange={e => setAccountFormData({ ...accountFormData, gender: e.target.value })}>
                          <option>{t('t_4ad35edf')}</option>
                          <option>{t('t_f406d100')}</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label className="form-label">{t('t_cbc610cb')}</label>
                        <input type="number" className="form-input" value={accountFormData.height} onChange={e => setAccountFormData({ ...accountFormData, height: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <label className="form-label">{t('t_6c9e1f48')}</label>
                        <input type="number" className="form-input" value={accountFormData.weight} onChange={e => setAccountFormData({ ...accountFormData, weight: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                  </div>
                )}

                {accountActiveTab === 'security' && (
                  <div className="animate-slide-up">
                    <div className="form-group">
                      <label className="form-label">{t('t_ce8ae9da')}</label>
                      <input type="email" className="form-input" value={accountFormData.email} onChange={e => setAccountFormData({ ...accountFormData, email: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                      <label className="form-label">{t('t_917aaccb')}</label>
                      <input type="password" placeholder={t('t_22bfd9b8')} className="form-input" value={accountFormData.currentPassword} onChange={e => setAccountFormData({ ...accountFormData, currentPassword: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('t_4df84aa5')}</label>
                      <input type="password" placeholder={t('t_f98e3fe8')} className="form-input" value={accountFormData.newPassword} onChange={e => setAccountFormData({ ...accountFormData, newPassword: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{t('t_493827ca')}</label>
                      <input type="password" placeholder={t('t_82a9a4ed')} className="form-input" value={accountFormData.confirmNewPassword || ''} onChange={e => setAccountFormData({ ...accountFormData, confirmNewPassword: e.target.value })} />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button className="btn-secondary" onClick={() => setIsAccountModalOpen(false)} style={{ flex: 1 }}>{t('Hủy')}</button>
                  <button className="btn-primary" disabled={isSavingAccount} onClick={async () => {
                    if (accountFormData.newPassword && accountFormData.newPassword !== accountFormData.confirmNewPassword) {
                          alert(t('t_400bcf89'));
                          return;
                        }
                        if ((accountFormData.email !== currentUser.email || accountFormData.newPassword) && !accountFormData.currentPassword) {
                      alert(t('t_bb59e33f'));
                      setAccountActiveTab('security');
                      return;
                    }

                    setIsSavingAccount(true);
                    try {
                      // 1. Update Security if changed
                      if (accountFormData.email !== currentUser.email || accountFormData.newPassword) {
                        const authRes = await fetch(`${API_URL}/auth/account`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                          body: JSON.stringify({
                            email: accountFormData.email,
                            current_password: accountFormData.currentPassword,
                            new_password: accountFormData.newPassword || undefined
                          })
                        });
                        if (!authRes.ok) {
                          const errData = await authRes.json().catch(() => ({}));
                          alert(errData.detail || 'Lỗi khi cập nhật tài khoản');
                          setIsSavingAccount(false);
                          return;
                        }
                      }

                      // 2. Update Profile
                      const payload = {
                        name: accountFormData.name,
                        dob: accountFormData.dob,
                        gender: accountFormData.gender,
                        height: accountFormData.height,
                        weight: accountFormData.weight,
                        goal: currentUser.userData.goal,
                        equipment: currentUser.userData.equipment,
                        experience: currentUser.userData.experience
                      };
                      const res = await fetch(`${API_URL}/profile`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                        body: JSON.stringify(payload)
                      });
                      if (res.ok) {
                        const newProfile = await res.json();
                        setCurrentUser({
                            ...currentUser,
                            email: accountFormData.email,
                            userData: {
                                name: newProfile.name,
                                dob: newProfile.dob,
                                gender: newProfile.gender,
                                height: newProfile.height,
                                weight: newProfile.weight,
                                goal: newProfile.goal,
                                equipment: newProfile.equipment,
                                experience: newProfile.experience,
                                avatar_url: newProfile.avatar_url
                            },
                            aiOutput: {
                                bmi: newProfile.bmi,
                                bmiStatus: newProfile.bmi_status,
                                targetCalories: newProfile.target_calories,
                                bmr: newProfile.bmr,
                                tdee: newProfile.tdee,
                                goalLabel: newProfile.goal === 'lose_weight' ? t('Giảm cân') : newProfile.goal === 'build_muscle' ? t('Tăng cơ') : newProfile.goal === 'stay_fit' ? t('Giữ dáng') : t('Sức bền'),
                                macros: {
                                    protein: { grams: Math.round(newProfile.target_calories * 0.3 / 4), color: '#3b82f6' },
                                    carbs: { grams: Math.round(newProfile.target_calories * 0.4 / 4), color: '#10b981' },
                                    fat: { grams: Math.round(newProfile.target_calories * 0.3 / 9), color: '#f59e0b' }
                                },
                                meals: JSON.parse(newProfile.nutrition_plan || '[]'),
                                recommendedExercises: JSON.parse(newProfile.workout_schedule || '[]')
                            }
                        });
                        setIsAccountModalOpen(false);
                        alert(t('t_9168dc1f'));
                      } else { alert(t('t_9baa5683')); }
                    } catch (err) { alert(t('t_d3880593')); }
                    setIsSavingAccount(false);
                  }} style={{ flex: 1 }}>{isSavingAccount ? t('Đang lưu...') : t('Lưu Thay Đổi')}</button>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================================================
             5. SYSTEM EXERCISES LIST PAGE
             ========================================================================== */}
          {appState === 'exercise_list' && (
            <div style={{ marginTop: '30px', paddingBottom: '60px' }}>
              <h2 style={{ marginBottom: '8px' }}>{t('t_06e3ad7f')}</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{t('t_2a07de0a')}</p>

              <div className="filter-bar">
                {['Tất cả', 'Ngực', 'Lưng & Xô', 'Đùi & Mông', 'Bụng', 'Tay trước', 'Tay sau', 'Vai', 'Toàn thân'].map(group => (
                  <button 
                    key={t(group)}
                    className={`filter-btn ${muscleFilter === group ? 'active' : ''}`}
                    onClick={() => setMuscleFilter(group)}
                  >
                    {t(group)}
                  </button>
                ))}
              </div>

              <div className="exercises-grid custom-scrollbar">
                {getFilteredExercises().map(ex => (
                  <div className="glass-card exercise-card" key={ex.id}>
                    <div className="exercise-img-placeholder">
                      {ex.emoji}
                      <span className="exercise-tag">{ex.difficulty}</span>
                    </div>
                    <h4>{t(ex.name)}</h4>
                    <p style={{ fontSize: '0.85rem', height: '40px', overflow: 'hidden' }}>{ex.description}</p>
                    
                    <div className="exercise-details">
                      <div className="detail-badge">{t('t_4b4957ba')} <span>{t(ex.muscle_group)}</span></div>
                      <div className="detail-badge">{t('t_b406f2cc')} <span style={{textTransform: 'capitalize'}}>{ex.equipment}</span></div>
                    </div>
                  </div>
                ))}
                {getFilteredExercises().length === 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {t('t_5e376bc1')}
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
              {t('t_9c10b26d')}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;
