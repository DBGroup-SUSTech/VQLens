<template>
  <div class="header-main">

    <el-select v-model="selectedData" placeholder="uploadData" class="custom-select">
      <el-option-group
          v-for="group in this.dataOptions"
          :key="group.label"
          :label="group.label">
        <el-option
            v-for="item in group.options"
            :key="item.value"
            :label="item.value"
            :value="item.value">
        </el-option>
      </el-option-group>
    </el-select>

    <el-select v-model="selectedModel" filterable placeholder="modelType" class="custom-select">
      <el-option
          v-for="item in this.modelOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value">
      </el-option>
    </el-select>

    <el-select v-model="selectedQuery" filterable placeholder="queryID" @change="uploadData" class="custom-select">
      <el-option
          v-for="item in this.queryOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value">
      </el-option>
    </el-select>

  </div>
</template>


<script>

import api from "@/api/data"
import {mapState} from "vuex";

export default {
  name: "HeaderView",
  data() {
    return {
      selectedData: "",
      selectedQuery: "",
      selectedModel: "",
      dataOptions: [],
      modelOptions:[],
      queryOptions: [],
    };
  },
  mounted() {
    this.getDataNames();
  },
  methods: {
    async getDataNames() {
      const reponse = await api.getDataNames()
      this.dataOptions = reponse["data"]["dataSetOptions"]
    },
    async getModelNames(dataName) {
      const reponse = await api.getModelNames({"dataName": dataName})
      this.modelOptions = reponse["data"]["modelOptions"]

    },
    async getQueryId(dataModel) {
      const reponse = await api.getQueryIDs({"modelName": dataModel});
      this.queryOptions = reponse["data"]["queryOptions"]
    },
    async setDataInfo(fileName) {
      this.$store.commit("setFileName", fileName)
      let res1 = await api.getDataNodeLink({"fileName": fileName})
      this.$store.commit("setDataNodeLink", res1["data"])
      let res2 = await api.getDataTree({"fileName": fileName})
      this.$store.commit("setDataTree", res2["data"])
    },
    async uploadData(event) {
      if (this.dataOptions && this.modelOptions && this.queryOptions) {
        let fileName = this.selectedData + "_" +this.selectedModel + "_" + this.selectedQuery;
        await this.setDataInfo(fileName);
      }

    },
  },
  computed: {
    ...mapState({
      fileName: "fileName"
    })

  },
  watch: {
    fileName(newVal) {
      this.setDataInfo(newVal)
    },
    selectedData(newVal){
      this.selectedData = newVal;
      this.selectedModel = "";
      this.selectedQuery = "";
      this.getModelNames(this.selectedData);
    },
    selectedModel(newVal){
      this.selectedModel = newVal;
      this.selectedQuery = "";
      let dataModel = this.selectedData + "_" + this.selectedModel;
      this.getQueryId(dataModel);
    }
  }
};
</script>

<style scoped lang="scss">
.header-main {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
  font-size: 30px;
  color: #595959;
}

.custom-select {
  margin-left: 20px;
  width: 150px;
}

</style>
