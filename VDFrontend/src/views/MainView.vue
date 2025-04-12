<template>
  <div class="main-view">
    <div class="main">
      <div class="top-view">
        <div class="left-view">
          <left-main-view />
        </div>
        <div class="middle-view">
          <middle-main-view />
        </div>
      </div>
      <div class="bottom-view">
        <bottom-main-view />
      </div>
    </div>
    <div class="right-view">
      <right-main-view/>
    </div>
  </div>
</template>

<script>

import LeftMainView from "@/views/MainView/LeftMainView/LeftMainView.vue";
import MiddleMainView from "@/views/MainView/MiddleMainView/MiddleMainView.vue";
import RightMainView from "@/views/MainView/RightMainView/RightMainView.vue"
import BottomMainView from "@/views/MainView/BottomMainView/BottomMainView.vue"

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
  display: flex;
  height: 100%;
  box-sizing: border-box;
  background-color: #eaecee;
  overflow: hidden;
  gap: 3px;
  padding: 2px 3px 2px 3px;
}

.main {
  flex: 1.2;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 3px;
  border-radius: 3px;


  .top-view {
    flex: 2;
    width: 100%;
    border-radius: 3px;
    display: flex;
    gap: 3px;

    .left-view{
      flex: 0.8;
      height: 100%;
      border-radius: 3px;
    }

    .middle-view{
      flex: 2;
      height: 100%;
      background-color: white;
      border-radius: 3px;
    }

  }

  .bottom-view{
    flex: 1;
    width: 100%;
    border-radius: 3px;
    background-color: white;

  }

}

.right-view {
    flex: 1;
    height: 100%;
    border-radius: 3px;
    background-color: white;
    overflow: hidden;
  }


</style>
