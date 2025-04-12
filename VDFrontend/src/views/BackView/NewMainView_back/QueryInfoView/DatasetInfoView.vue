<template>
  <div v-if="dataInfo" class="dataset-info-main">
    <div class="text-data-intro">
      DatasetInfo
    </div>
    <div class="dataset-info-show">

      <div class="attribute">
        Dataset Name: {{ getDataName() }}
      </div>
      <div class="attribute">
        Embedding Model: {{ getModelName() }}
      </div>
      <div class="attribute">
        Embedding Vector Shape row: {{ this.row }}, column: {{ this.column }}
      </div>

    </div>

  </div>
</template>
<script>
import {mapState} from "vuex";
import api from "@/api/data";
import * as d3 from "d3";

export default {
  name: "DatasetInfoView",
  props: {
    dataInfo: {
      type: String,
      required: true,
    }

  },
  data(){
    return{
      row: "",
      column: ""
    }
  },
  mounted() {
    this.getVector(this.dataInfo);
  },

  methods: {
    async getVector(data) {
      console.log("filename",data)
      const reponse = await api.getVectorShape({"fileName": data});
      this.row = reponse["data"]["row"];
      this.column = reponse["data"]["column"];
    },
    getDataName() {
      const dataName = this.dataInfo.split("_")[0];
      return dataName;
    },
    getModelName() {
      const modelName = this.dataInfo.split("_")[1];
      return modelName;
    },

  },
  computed: {
    ...mapState({
      fileName: "fileName"
    })

  },
};

</script>
<style scoped lang="scss">
.dataset-info {
  height: 100%;
  width: 100%;
  overflow-y: auto;
}

.text-data-intro {
  height: 25px;
  font-size: 14px; /* 设置字体大小 */
  box-sizing: border-box;
  align-content: center;
  align-items: center;
  padding-left: 5px;
  padding-bottom: 15px;

}

.attribute {
  font-size: 14px; /* 设置字体大小 */
  height: 25px;
  box-sizing: border-box;
  align-content: center;
  align-items: center;
  padding-left: 10px;

}


</style>