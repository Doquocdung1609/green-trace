// src/services/mockAuth.ts
export const mockUsers = [
  { email: 'farmer@gmail.com', password: '123456', role: 'farmer', name: 'Nguyen Van A' },
  { email: 'admin@gmail.com', password: '123456', role: 'admin', name: 'Admin B' },
  { email: 'user@gmail.com', password: '123456', role: 'customer', name: 'User C' },
];

export const mockLogin = async (email: string, password: string) => {
  const user = mockUsers.find((u) => u.email === email && u.password === password);
  if (!user) throw new Error('Sai thông tin đăng nhập');
  localStorage.setItem('currentUser', JSON.stringify(user));
  return user;
};

export const mockLogout = () => {
  localStorage.removeItem('currentUser');
};
