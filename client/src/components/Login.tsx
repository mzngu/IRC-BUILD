import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); 
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); 

    try {
      const response = await axios.post('http://localhost:3000/auth/login', { 
        username,
        password,
      });

      console.log("Login Response:", response);

      if (response.status !== 200) { 
        const errorData = response.data;
        console.error("Login Error:", errorData);
        setError(errorData.message || "Login failed"); 
        return;
      }

      localStorage.setItem('token', response.data.access_token); 
      alert('Login successful');
      navigate('/chat'); 

    } catch (error) {
      console.error("Login Error (Catch):", error);
      if (axios.isAxiosError(error)) {
        console.error("Axios Error Details:", error.response?.data);
        setError(error.response?.data?.message || "Login failed"); 
      } else {
        setError("Login failed"); 
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto p-4 bg-white shadow-md rounded">
      {error && <p className="text-red-500 mb-4">{error}</p>} {/* Display error message */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <div className="mb-6">
        <label className="block text-gray-700 text-sm font-bold mb-2">Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
      <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
        Login
      </button>
    </form>
  );
};

export default Login;