<template>
  <div class="new-main-view">
    <div class="header">
      <header-view/>
    </div>
    <div class="main">
      <div class="left-view">
        <query-info-view/>
      </div>
      <div class="right-view">

        <el-tabs v-if="this.$store.state.fileName" v-model="selectedTabsValue" type="card">
          <el-tab-pane
              :key="item"
              v-for="(item, index) in editableTabs"
              :label="item"
              :name="item"
          >

            <div v-if="item === 'NodeLinkView'" class="view-main">
              <node-link-view/>
            </div>
            <div v-else-if="item === 'TreeView'" class="view-main">
              <tree-view/>
            </div>

          </el-tab-pane>
        </el-tabs>

      </div>
    </div>
  </div>
</template>

<script>
import HeaderView from "@/views/NewMainView/HeaderView.vue";
import NodeLinkView from "@/views/NewMainView/NodeLinkView.vue";
import TreeView from "@/views/NewMainView/TreeView.vue";
import QueryInfoView from "@/views/NewMainView/QueryInfoView.vue";

export default {
  name: "NewMainView",
  components: {
    HeaderView, NodeLinkView, TreeView,QueryInfoView
  },
  data() {
    return {
      selectedTabsValue: "NodeLinkView",
      editableTabs: ["NodeLinkView", "TreeView"],
      svgWidth: 0,
      svgHeight: 0,
    }
  },
  mounted() {
  },
  method: {},
  watch: {
    selectedTabsValue(newVal) {
      this.$store.commit("updateSelectedTab", newVal);
    }
  }

};
</script>

<style lang="scss">
.new-main-view {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background-color: #eaecee;
  overflow: hidden;
}

.header {
  height: 60px;
  width: 100%;
}

.main {
  display: flex;
  justify-content: space-between;
  border-radius: 5px;
  margin-left: 4px;
  height: calc(100% - 62px);
  width: calc(100% - 8px);
  background-color: #eaecee;

  .left-view {
    height: 100%;
    width: 300px;
    border-radius: 5px;
    background-color: white;

  }

  .right-view {
    height: 100%;
    width: calc(100% - 305px);
    margin-left: 6px;
    border-radius: 5px;
    background-color: white;
    overflow: hidden;

    .el-tabs {
      height: 100%;
      width: 100%;
      margin-left: -1px;
    }

    .el-tabs.el-tabs--card > .el-tabs__header {
      height: 40px;
      padding: 0;
      position: static;
      margin: 0 0 0;
    }

    .el-tabs__content {
      height: calc(100% - 40px);
      position: static;
    }

    .el-tab-pane {
      height: 100%;
      position: static;
    }
  }

}

.view-main {
  overflow-y: auto;
  height: 100%;
  width: 100%;
}
</style>
