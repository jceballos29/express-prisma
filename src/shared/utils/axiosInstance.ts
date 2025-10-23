import axios from 'axios';

const axiosInstance = axios.create({ timeout: 50000 });
// Establecer header por defecto
axiosInstance.defaults.headers.common['Authorization'] = `Bearer B3y7ptG4uXA7Jpy7IlE0mCVHopSeSmznSZADtttKJOk`;



export default axiosInstance;
