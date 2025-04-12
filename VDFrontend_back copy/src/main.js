import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

import store from "./store/";

import ElementUI from "element-ui";
import 'element-ui/lib/theme-chalk/index.css';
Vue.use(ElementUI, {size: "mini"});

import * as echarts from 'echarts';
Vue.prototype.$echarts = echarts

new Vue({
  render: h => h(App),
  store: store
}).$mount('#app')
