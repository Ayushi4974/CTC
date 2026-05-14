import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api';

const user = JSON.parse(localStorage.getItem('user'));
const savedWallet = localStorage.getItem('walletAddress');

const initialState = {
  user: user ? user : null,
  profile: null,
  walletAddress: savedWallet ? savedWallet : null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

export const login = createAsyncThunk('auth/login', async (userData, thunkAPI) => {
  try {
    const response = await api.post('/auth/login', userData);
    if (response.data) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const register = createAsyncThunk('auth/register', async (userData, thunkAPI) => {
  try {
    const response = await api.post('/auth/register', userData);
    if (response.data) {
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  localStorage.removeItem('user');
});

export const fetchProfile = createAsyncThunk('auth/profile', async (_, thunkAPI) => {
  try {
    const response = await api.get('/user/profile');
    return response.data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || 'Error fetching profile');
  }
});

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    setWalletAddress: (state, action) => {
      state.walletAddress = action.payload;
      if (action.payload) {
        localStorage.setItem('walletAddress', action.payload);
      } else {
        localStorage.removeItem('walletAddress');
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.user = null;
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.user = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.profile = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      });
  },
});

export const { reset, setWalletAddress } = authSlice.actions;
export default authSlice.reducer;
