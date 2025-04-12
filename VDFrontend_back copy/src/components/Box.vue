<template>
  <div class="box">
    <el-collapse accordion>
      <el-collapse-item v-for="(item, index) in items" :key="index" :class="getHighlightClass(item.nodeList)">
        <template slot="title">
          {{ item.title }}<i :class="`header-icon ${item.iconClass}`"></i>
        </template>
        <el-card :body-style="{ padding: '0px' }">
          <img :src="item.contents.imageUrl" class="image">
          <div style="padding: 10px;">
            <span>Image Path: {{ item.contents.imagePath }}</span>
            <div v-if="item.type !== 'query'" class="bottom clearfix">
              <!-- <span>Distance: {{ item.distance }}</span> -->
              <span>TopK-{{ item.topK }}</span>
              <span>TopK-{{ item.nodeList }}</span>
            </div>
          </div>
        </el-card>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script>

import * as d3 from "d3";
import { mapState } from "vuex";
import api from "@/api/data";
import Box from "@/components/Box.vue";
import { index } from "d3";

export default {
  name: "Box",
  props: {
    items: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      // currentDate: new Date()
    }
  },
  methods: {
    getHighlightClass(nodeId) {
      console.log("发生改变",this.selectedNode,nodeId)
      if (nodeId == this.selectedNode) {
        return 'highlighted';
      }
      return '';
    }
  },
  computed: {
    ...mapState({
      selectedNode: "selectedNode"
    })


  }
};
</script>

<style scoped lang="scss">
.box {
  margin: 0 0;
  box-sizing: border-box;
}

.box::v-deep .el-collapse-item__header {
  font-size: 13px !important;

}

.box::v-deep .el-collapse-item {
  box-sizing: border-box;
  padding-left: 15px;
  border-radius: 8px !important;
  margin-bottom: 5px;
  border: 1px solid #EBEEF5 !important;
}

.box::v-deep .el-collapse-item__header {
  height: 35px;
  border-bottom: none !important;
}

.el-collapse-item__content .box::v-deep .box::v-deep .el-collapse {
  padding-bottom: 10px !important;
}

.time {
  font-size: 13px;
  color: #999;
}

.bottom {
  // margin-top: 13px;
  line-height: 12px;
  height: 40px !important;
}

.button {
  padding: 0;
  float: right;
}

.image {
  box-sizing: border-box;
  padding: 10px 10px 10px 10px;
  width: 100%;
  display: block;
}

.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}

.clearfix:after {
  clear: both
}

.highlighted {
  background-color: yellow;
}
</style>