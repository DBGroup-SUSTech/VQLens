<template>

  <div v-if="this.$store.state.fileName" class="query-info-main">
    <div class="text-intro">
      QueryInfoView
    </div>

    <div class="dataset-info">
      <dataset-info-view :dataInfo="fileName" />
    </div>

    <div class="index-setting">
      <index-setting-view/>
    </div>

    <div class="search-info">
      <search-info-view :searchParam="fileName"/>
    </div>

  </div>

</template>

<script>
import * as d3 from "d3";
import {mapState} from "vuex";
import api from "@/api/data";
import DatasetInfoView from "@/views/NewMainView/QueryInfoView/DatasetInfoView";
import IndexSettingView from "@/views/NewMainView/QueryInfoView/IndexSettingView";
import SearchInfoView from "@/views/NewMainView/QueryInfoView/SearchInfoView";

export default {
  name: "QueryInfoView",
  components: {SearchInfoView, IndexSettingView, DatasetInfoView},
  data() {
    return {};
  },
  mounted() {

  },
  methods: {},
  computed: {
    ...mapState({
      fileName: "fileName"
    })

  },
  watch: {
  }
};
</script>


<style>
.query-info-main {
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 4px 10px 3px;
}

.text-intro {
  height: 25px;
  box-sizing: border-box;
  font-size: 14px; /* 设置字体大小 */
  align-content: center;
  align-items: center;
  padding-left: 5px;
  padding-bottom: 15px;
}

.dataset-info {
  width: 100%;
  height: 250px;
  box-sizing: border-box;
  border: 1px solid #B9B9BB;
  border-radius: 3px;
}

.index-setting {
  width: 100%;
  height: 250px;
  margin-top: 10px;
  box-sizing: border-box;
  border: 1px solid #B9B9BB;
  border-radius: 3px;
}

.search-info {
  width: 100%;
  height: calc(100% - 535px);
  margin-top: 10px;
  box-sizing: border-box;
  border: 1px solid #B9B9BB;
  border-radius: 3px;
}


</style>