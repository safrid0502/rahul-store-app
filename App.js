import { useState, useEffect } from 'react';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './screens/LoginScreen';
import MainStore from './screens/MainStore';

export default function App() {
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkLogin(); }, []);

  const checkLogin = async () => {
    try {
      const saved = await AsyncStorage.getItem('staff_profile');
      if (saved) setStaff(JSON.parse(saved));
    } catch {}
    setLoading(false);
  };

  const handleLogin = async (staffMember) => {
    await AsyncStorage.setItem(
      'staff_profile', JSON.stringify(staffMember)
    );
    setStaff(staffMember);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('staff_profile');
    setStaff(null);
  };

  if (loading) return null;

  return (
    <>
      <StatusBar barStyle="light-content"
        backgroundColor="#060E06" />
      {!staff ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <MainStore staff={staff} onLogout={handleLogout} />
      )}
    </>
  );
}