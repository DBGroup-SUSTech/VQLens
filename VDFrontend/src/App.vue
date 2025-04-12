<template>
  <div id="app">
    <main-view/>
  </div>
</template>

<script>

import MainView from "@/views/MainView";

export default {
  name: "App",
  components: {
    MainView
  },
};
</script>

<style lang="scss">
html, body {
  width: 100%;
  height: 100%;
  margin: 0 !important;
  box-sizing: border-box;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  width: 100%;
  height: 100%;
  user-select: none;
}

.boundary {
  border: 1px solid black;
}

.el-tooltip__popper {
  max-width: 300px;
}
</style>
