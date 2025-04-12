<template>

  <div v-if="searchParam" class="search-info-main">
    <div class="text-search-info">
      SearchResult
    </div>

    <div class="query-show">

      <div class="text">Query ID: {{ this.queryId }}</div>

      <img :src=this.imageUrl alt="SelectedQuery Information!"/>

      <div v-if="this.searchList">
        <div class="text">Search Result: {{ this.searchImageUrlList.length }}</div>
        <div class="result-image" v-for="(url, index) in this.searchImageUrlList" :key="index">
          <div class="text">{{ getContent(index) }}</div>
          <img :src="url" alt="image">
        </div>
      </div>

    </div>

  </div>

</template>

<script>
import * as d3 from "d3";
import {mapState} from "vuex";
import api from "@/api/data";

export default {
  name: "SearchInfoView",
  props: {
    searchParam: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      imageUrl: "",
      queryId: "",
      searchList: [],
      searchImageUrlList: [],
    };
  },
  mounted() {
    this.init();
  },
  methods: {
    init() {
      const id = this.searchParam.split("_")[2];
      this.queryId = id;
      this.getQueryImageUrl(id);
      this.searchList = this.getSearchIDList(this.searchParam);
    },
    getContent(data) {
      return this.searchList[data];
    },
    async getQueryImageUrl(data) {

      const id = this.searchParam.split("_")[2];
      this.queryId = id;
      const res = await api.getImageUrl({"fileName": this.searchParam, "nodeId": this.queryId});
      this.imageUrl = res.data.image_url;
    },
    async getSearchIDList(data) {

      const res = await api.getSearchIDs({"fileName": data});
      this.searchList = res["data"]["searchID"];
      this.searchList.reverse();
    },
    async getSearchImageUrl() {
      this.searchImageUrlList = [];
      for (let i = 0; i < this.searchList.length; i++) {
        const res = await api.getImageUrl({"fileName": this.$store.state.fileName, "nodeId": this.searchList[i]});
        this.searchImageUrlList.push(res["data"]["image_url"]);
      }
    },
  },
  computed: {
    ...mapState({
      fileName: "fileName"
    })

  },
  watch: {
    searchParam(newVal) {
      this.init();
    },
    searchList(newVal) {
      this.getSearchImageUrl();
    },
  }
};
</script>

<style>
.search-info-main {
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  padding: 2px 2px 4px 4px;
}

.query-show {
  width: 100%;
  height: calc(100% - 20px);
  box-sizing: border-box;
  overflow: auto;
}

.text-search-info {
  height: 20px;
  font-size: 14px; /* 设置字体大小 */
  box-sizing: border-box;
  align-content: center;
  align-items: center;
  padding-left: 5px;
}

.text {
  height: 15px;
  width: 100%;
  box-sizing: border-box;
  align-items: center; /* 垂直居中 */
  font-size: 10px; /* 设置字体大小 */
  padding-left: 15px;
}

.query-show img {
  max-width: calc(100% - 20px);
  max-height: 180px;
  padding: 5px 5px 5px 5px;
  display: block;
  margin: auto;
}

</style>