<template>
  <div class="main-view">

    <div class="main">

      <div class="left-view">
        <left-main-view />
      </div>
      <div class="middle-view">
        <middle-main-view />
      </div>
      <div class="right-view">
        <right-main-view />
      </div>

    </div>
    <div class="bottom-view">
      <bottom-main-view/>
    </div>

  </div>
</template>

<script>

import LeftMainView from "@/views/MainView/LeftMainView.vue";
import MiddleMainView from "@/views/MainView/MiddleMainView.vue";
import RightMainView from "@/views/MainView/RightMainView.vue"
import BottomMainView from "@/views/MainView/BottomMainView.vue"

export default {
  name: "MainView",
  components: {
    LeftMainView, MiddleMainView, RightMainView, BottomMainView
  },
  data() {
    return {
    }
  },
  mounted() {
  },
  method: {},
  watch: {
  }

};
</script>

<style lang="scss">
.main-view {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background-color: #eaecee;
  overflow: hidden;
}

.main {
  width: calc(100% - 10px);
  height: calc(100% - 330px);
  margin-left: 5px;
  margin-top: 3px;
  box-sizing: border-box;
  display: flex;
  gap: 5px;

  .left-view {
    flex: 2;
    height: 100%;
    border-radius: 5px;
  }

  .middle-view {
    flex: 8;
    height: 100%;
    border-radius: 5px;
    background-color: white;
  }

  .right-view {
    flex: 1.2;
    height: 100%;
    border-radius: 5px;
    background-color: white;
    overflow: hidden;
  }
}

.bottom-view {
  width: calc(100% - 10px);
  height: 330px;
  margin-top: 5px;
  margin-left: 5px;
  box-sizing: border-box;
}
</style>
