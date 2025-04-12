<template>
  <div class="index-setting-main">
    <div class="text-index-setting">
      IndexSetting
    </div>
    <div class="index-setting-show">

      <div style="display: flex; align-items: center;height: 50px">
        <div style="font-size: 12px;margin-right: 5px">IndexAlg:</div>
        <el-select v-model="searchSetting['indexAlg']" filterable placeholder="Index Type"
                   style="width: 120px;height: 30px;margin-left: 10px">
          <el-option
              v-for="item in indexOptions"
              :key="item"
              :label="item"
              :value="item">
          </el-option>
        </el-select>
      </div>

      <div style="font-size: 12px;height: 40px">
        QueryID:
        <el-input
            style="width: 100px;height: 20px;margin-left: 10px"
            placeholder="QueryID"
            suffix-icon="el-icon-eleme"
            v-model="searchSetting['queryID']">
        </el-input>
      </div>

      <div style="font-size: 12px;height: 40px">
        Tok:
        <el-input
            style="width: 100px;height: 20px;margin-left: 10px"
            placeholder="Tok"
            suffix-icon="el-icon-eleme"
            v-model="searchSetting['tok']">
        </el-input>
      </div>

      <div style="font-size: 12px;height: 40px">
        K:
        <el-input
            style="width: 100px;height: 20px;margin-left: 10px"
            placeholder="K"
            suffix-icon="el-icon-eleme"
            v-model="searchSetting['k']">
        </el-input>
      </div>

      <div style="font-size: 12px;height: 40px">
        L:
        <el-input
            style="width: 100px;height: 20px;margin-left: 10px"
            placeholder="L"
            suffix-icon="el-icon-eleme"
            v-model="searchSetting['l']">
        </el-input>
      </div>
      <div style="display: flex; justify-content: center;">
        <el-button type="primary" plain @click="getSearchResults">Start!</el-button>
      </div>

    </div>

  </div>


</template>
<script>
import {mapState} from "vuex";
import api from "@/api/data";
import * as d3 from "d3";

export default {
  name: "IndexSettingView",
  props: {},
  data() {
    return {
      indexOptions: [],
      searchSetting: {
        "fileName": "",
        "indexAlg": "nsg",
        "queryID": "",
        "tok": "10",
        "k": "25",
        "l": "40",
      },
    }
  },
  mounted() {
    this.getBuildAlg();
  },
  methods: {
    async getBuildAlg() {
      const reponse = await api.getBuildAlg();
      this.indexOptions = reponse["data"]["indexsList"]
    },
    async getSearchResults() {
      this.searchSetting['fileName'] = this.$store.state.fileName;
      console.log("shuchu",this.searchSetting);
      const reponse = await api.getSearchResults({"searchSetting":this.searchSetting});
      // 处理一下 fileName 

      if (reponse['data']) {
        let updateFileName = this.$store.state.fileName.split('_id')[0] +  `_id${this.searchSetting['queryID']}`;
        this.$store.commit("setFileName", updateFileName);
      }
    }

  },
    computed: {
    ...mapState({
      fileName: "fileName"
    })

  },
};

</script>
<style scoped lang="scss">
.index-setting-main {
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  padding: 2px 4px 2px 4px;
  overflow-y: auto;
}

.text-index-setting {
  height: 20px;
  font-size: 14px; /* 设置字体大小 */
  box-sizing: border-box;
  align-content: center;
  align-items: center;
  padding-left: 5px;
}

.index-setting-show {
  width: 100%;
  height: calc(100% - 20px);

}

</style>