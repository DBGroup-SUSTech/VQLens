import axios from 'axios'

const service = axios.create({
    baseURL: "http://10.16.70.46:8787/",
    timeout: 10000000
})

service.interceptors.request.use(
    config => {
        return config;
    },
    error => {
        return Promise.reject(error);
    }
)

service.interceptors.response.use(
    response => {
        const code = response.status
        if (code !== 200) {
            return Promise.reject(response);
        } else {
            return Promise.resolve(response);
        }node
    },
    error => {
        let code = 0, errMsg = '';
        try {
            code = error.response.status;
        } catch (e) {
            errMsg = error.toString();
            if (errMsg.indexOf('Error: timeout') !== -1) {
                alert(errMsg);
                return Promise.reject(error);
            }
        }
        if (code) {
            if (code === 500) {
                alert("error");
            } else {
                alert(errMsg);
            }
        }
        return Promise.reject(error.response);
    }
)

export default service;
